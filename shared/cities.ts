export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  IN: [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune",
    "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam",
    "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut",
    "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai",
    "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada",
    "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati", "Solapur",
    "Hubli-Dharwad", "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur",
    "Moradabad", "Jalandhar", "Bhubaneswar", "Salem", "Warangal", "Guntur", "Bhiwandi",
    "Saharanpur", "Gorakhpur", "Bikaner", "Amravati", "Noida", "Jamshedpur", "Bhilai",
    "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur",
    "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga",
    "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar", "Jammu",
    "Sangli-Miraj", "Mangalore", "Erode", "Belgaum", "Ambattur", "Tirunelveli",
    "Malegaon", "Gaya", "Jalgaon", "Udaipur", "Maheshtala", "Davanagere",
    "Kozhikode", "Kurnool", "Bokaro", "South Dumdum", "Bellary", "Patiala",
    "Gopalpur", "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati",
    "Latur", "Dhule", "Rohtak", "Korba", "Bhilwara", "Berhampur", "Muzaffarpur",
    "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Anantapur",
    "Kamarhati", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur",
    "Shimoga", "Chandrapur", "Junagadh", "Thrissur", "Alwar", "Bardhaman",
    "Kulti", "Kakinada", "Nizamabad", "Parbhani", "Tumkur", "Khammam",
    "Ozhukarai", "Bihar Sharif", "Panipat", "Darbhanga", "Bally", "Aizawl",
    "Dewas", "Ichalkaranji", "Karnal", "Bathinda", "Jalna", "Eluru",
    "Kirari Suleman Nagar", "Barasat", "Purnia", "Satna", "Mau",
    "Sonipat", "Farrukhabad", "Durg", "Imphal", "Ratlam", "Hapur",
    "Arrah", "Karimnagar", "Etawah", "Ambarnath",
    "Ganganagar", "Bharatpur", "Begusarai"
  ]
};

export function getCitiesByCountry(countryCode: string): string[] {
  const list = CITIES_BY_COUNTRY[countryCode || "IN"] || CITIES_BY_COUNTRY.IN;
  return Array.from(new Set(list));
}
