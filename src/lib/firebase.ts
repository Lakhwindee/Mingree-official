import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  signOut as firebaseSignOut 
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);

// CRITICAL: Must pass firestoreDatabaseId for custom provisioned Firestore instance
export const firebaseDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const db = firebaseDb;
export const auth = firebaseAuth;

// Configure language for SMS OTP (English / India)
firebaseAuth.languageCode = "en";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo: firebaseAuth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(firebaseDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or connection.");
    }
  }
}

// Run connectivity check on module initialization
if (typeof window !== "undefined") {
  testConnection().catch(() => {});
}

/**
 * Initializes invisible or visible reCAPTCHA on the specified DOM container.
 */
export function setupRecaptcha(containerId: string = "recaptcha-container", size: "invisible" | "normal" = "invisible"): RecaptchaVerifier {
  // Clear any existing verifier
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {}
    window.recaptchaVerifier = undefined;
  }

  // Clear container DOM element if element exists
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }

  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size,
    callback: () => {
      // reCAPTCHA solved - will allow signInWithPhoneNumber
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Please try again.");
    }
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Sends SMS OTP to a phone number (E.164 format, e.g., +919876543210).
 */
export async function sendPhoneOtp(
  phoneNumber: string, 
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber.replace(/^0+/, "")}`;
  const confirmationResult = await signInWithPhoneNumber(firebaseAuth, formattedPhone, verifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

/**
 * Verifies the 6-digit OTP code against the ConfirmationResult.
 */
export async function verifyPhoneOtpCode(
  confirmationResult: ConfirmationResult,
  code: string
) {
  const result = await confirmationResult.confirm(code);
  const user = result.user;
  const idToken = await user.getIdToken();
  return {
    user,
    idToken,
    phoneNumber: user.phoneNumber,
    uid: user.uid,
  };
}

export { firebaseSignOut };
