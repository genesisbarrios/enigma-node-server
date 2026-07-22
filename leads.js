const express = require("express");
const axios = require("axios");

const router = express.Router();

const API_KEY = process.env.GOOGLE_API_KEY;

// Get coordinates from city
async function geocode(city) {
  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address: city,
        key: API_KEY
      }
    }
  );

  const location = response.data.results[0].geometry.location;

  return location;
}

// Search businesses
async function searchPlaces(keyword, location) {
  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    {
      params: {
        location: `${location.lat},${location.lng}`,
        radius: 50000,
        keyword,
        key: API_KEY
      }
    }
  );

  return response.data.results;
}

// Get details
async function getDetails(placeId) {
  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/place/details/json",
    {
      params: {
        place_id: placeId,
        fields:
          "name,website,formatted_phone_number,formatted_address,rating,user_ratings_total",
        key: API_KEY
      }
    }
  );

  return response.data.result;
}

// POST /api/leads
router.post("/", async (req, res) => {
  try {
    const { niche, city } = req.body;

    if (!niche || !city) {
      return res.status(400).json({ error: "niche and city are required" });
    }

    const location = await geocode(city);

    const places = await searchPlaces(niche, location);

    let leads = [];

    for (const place of places) {
      const business = await getDetails(place.place_id);

      if (!business.website) {
        leads.push({
          name: business.name,
          phone: business.formatted_phone_number || "",
          address: business.formatted_address || "",
          rating: business.rating || 0,
          reviews: business.user_ratings_total || 0,
          website: null
        });
      }
    }

    res.json({
      count: leads.length,
      leads
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed finding leads"
    });
  }
});

module.exports = router;
