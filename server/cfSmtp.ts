export type CloudflareSocketConnect = (
  address: { hostname: string; port: number },
  options?: { secureTransport?: "on" | "off" | "starttls"; allowHalfOpen?: boolean }
) => {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close: () => Promise<void>;
};

let cfSocketConnect: CloudflareSocketConnect | null = null;

export function setCloudflareSocketConnect(connectFn: CloudflareSocketConnect): void {
  cfSocketConnect = connectFn;
}

export function hasCloudflareSocketConnect(): boolean {
  return typeof cfSocketConnect === "function";
}

function wrapBase64Lines(b64: string, lineLength = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += lineLength) {
    lines.push(b64.slice(i, i + lineLength));
  }
  return lines.join("\r\n");
}

function sanitizeHeaderAddr(addr: string): string {
  return String(addr || "").replace(/[\r\n<>]/g, "").trim();
}

export async function sendMailViaCloudflareSocket(options: {
  user: string;
  pass: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
}): Promise<void> {
  if (!cfSocketConnect) {
    throw new Error("Cloudflare sockets API not initialized");
  }

  const fromEmail = sanitizeHeaderAddr(options.user);
  const toEmail = sanitizeHeaderAddr(options.to);
  const replyToEmail = sanitizeHeaderAddr(options.replyTo || fromEmail);
  const fromName = String(options.fromName || "Mingree").replace(/[\r\n"]/g, "").trim() || "Mingree";
  const senderDomain = (fromEmail.split("@")[1] || "mingree.com").replace(/[^a-zA-Z0-9.-]/g, "") || "mingree.com";
  const plainText = (
    options.text ||
    options.html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  ).trim();

  const socket = cfSocketConnect(
    { hostname: "smtp.gmail.com", port: 465 },
    { secureTransport: "on" }
  );

  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const readWithTimeout = async (): Promise<{ value?: Uint8Array; done: boolean }> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("SMTP connection timed out")), 15000);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  const readResponse = async (): Promise<{ code: number; text: string }> => {
    while (true) {
      const normalized = buffer.replace(/\r?\n/g, "\r\n");
      const lines = normalized.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const match = /^(\d{3})([ -])/.exec(line);
        if (match && match[2] === " ") {
          const code = Number(match[1]);
          const text = lines.slice(0, i + 1).join("\r\n");
          buffer = lines.slice(i + 1).join("\r\n");
          return { code, text };
        }
      }
      const { value, done } = await readWithTimeout();
      if (done) {
        throw new Error(`SMTP connection closed unexpectedly (${buffer.trim() || "EOF"})`);
      }
      buffer += decoder.decode(value, { stream: true });
    }
  };

  const sendCommand = async (command: string, expectedCodes: number[]): Promise<void> => {
    await writer.write(encoder.encode(`${command}\r\n`));
    const res = await readResponse();
    if (!expectedCodes.includes(res.code)) {
      throw new Error(`SMTP ${res.code}: ${res.text.replace(/\r\n/g, " | ")}`);
    }
  };

  try {
    const greeting = await readResponse();
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting ${greeting.code}: ${greeting.text}`);
    }

    await sendCommand(`EHLO ${senderDomain}`, [250]);

    const authToken = Buffer.from(`\0${fromEmail}\0${options.pass}`, "utf8").toString("base64");
    await sendCommand(`AUTH PLAIN ${authToken}`, [235]);

    await sendCommand(`MAIL FROM:<${fromEmail}>`, [250]);
    await sendCommand(`RCPT TO:<${toEmail}>`, [250, 251]);
    await sendCommand("DATA", [354]);

    const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject, "utf8").toString("base64")}?=`;
    const textBase64 = wrapBase64Lines(Buffer.from(plainText, "utf8").toString("base64"));
    const htmlBase64 = wrapBase64Lines(Buffer.from(options.html, "utf8").toString("base64"));
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2, 10)}@${senderDomain}>`;
    const boundary = `mingree_alt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const mimeMessage = [
      `Date: ${new Date().toUTCString()}`,
      `From: "${fromName}" <${fromEmail}>`,
      `Reply-To: "${fromName}" <${replyToEmail}>`,
      `To: <${toEmail}>`,
      `Subject: ${encodedSubject}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `X-Auto-Response-Suppress: OOF, AutoReply`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      textBase64,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      htmlBase64,
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    await writer.write(encoder.encode(`${mimeMessage}\r\n`));
    const dataRes = await readResponse();
    if (dataRes.code !== 250) {
      throw new Error(`SMTP DATA ${dataRes.code}: ${dataRes.text}`);
    }

    try {
      await sendCommand("QUIT", [221]);
    } catch {
      // Ignore QUIT close errors after 250 OK
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {}
    try {
      writer.releaseLock();
    } catch {}
    try {
      await socket.close();
    } catch {}
  }
}
