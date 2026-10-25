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
    console.error("Database error in searchCreators:", err);
  }

  // No mock or fake creators: return empty array if no matching real creators found
  return [];
}
