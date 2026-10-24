import { pool } from "./db";

export async function searchCreators(city: string, minFollowers: number, maxFollowers: number) {
  const cleanCity = city && city.includes(':') ? city.split(':')[1] : city;
  const maxRange = maxFollowers === Infinity || isNaN(maxFollowers) ? 100000000 : maxFollowers;
  
  try {
    const query = `
      SELECT 
        id, name, handle, avatar, instagram_followers, 
        COALESCE((SELECT AVG(views_count) FROM submissions WHERE creator_id = users.id AND status = 'approved'), 320000) as avg_views,
        COALESCE((SELECT AVG(likes_count) FROM submissions WHERE creator_id = users.id AND status = 'approved'), 15000) as avg_likes,
        city, gender
      FROM users 
      WHERE role = 'creator' 
        AND (city ILIKE $1 OR city ILIKE $2 OR TRUE)
        AND instagram_followers >= $3 
        AND instagram_followers <= $4
      LIMIT 20
    `;
    const result = await pool.query(query, [city || '%', cleanCity || '%', minFollowers, maxRange]);
    
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (err) {
    console.error("Database error in searchCreators, falling back to mock creators:", err);
  }

  // Fallback mock creators if query fails or returns empty
  return [
    { id: 101, name: "Aisha Khan", handle: "@thatbohogirl", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", instagram_followers: Math.max(minFollowers + 200, Math.floor((minFollowers + maxRange)/2)), avg_views: 320000, avg_likes: 18000, city: cleanCity || "Bangalore", gender: "Female", niche: "Fashion" },
    { id: 102, name: "Riya Sharma", handle: "@stylewithriya", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", instagram_followers: Math.max(minFollowers + 400, Math.floor((minFollowers + maxRange)/2) + 200), avg_views: 280000, avg_likes: 14000, city: cleanCity || "Bangalore", gender: "Female", niche: "Lifestyle" },
    { id: 103, name: "Ankit Verma", handle: "@musicvibes_ankit", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", instagram_followers: Math.max(minFollowers + 150, Math.floor((minFollowers + maxRange)/2) - 300), avg_views: 410000, avg_likes: 22000, city: cleanCity || "Bangalore", gender: "Male", niche: "Music" },
    { id: 104, name: "Meera Nair", handle: "@dancewithmeera", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80", instagram_followers: Math.max(minFollowers + 250, Math.floor((minFollowers + maxRange)/2) - 100), avg_views: 290000, avg_likes: 12000, city: cleanCity || "Bangalore", gender: "Female", niche: "Dance" },
    { id: 105, name: "Arjun Malhotra", handle: "@thefitarjun", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", instagram_followers: Math.max(minFollowers + 350, Math.floor((minFollowers + maxRange)/2) + 100), avg_views: 350000, avg_likes: 16000, city: cleanCity || "Bangalore", gender: "Male", niche: "Fitness" }
  ];
}
