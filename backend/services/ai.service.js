const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

exports.generateItinerary = async ({ fromCity, toCity, days, startDate, endDate, preferences }) => {
    console.log("KEY =", process.env.OPENAI_API_KEY);
    console.log("fromCity =", fromCity);
console.log("toCity =", toCity);
console.log("startDate =", startDate);
console.log("endDate =", endDate);
    console.log("days =", days);
    console.log("preferences =", preferences);

const prompt = `
You are a professional travel planner. Please design a detailed ${days}-day travel itinerary from **${fromCity}** to **${toCity}**.

## 🧭 Trip Overview
- **From**: ${fromCity}
- **To**: ${toCity}
- **Duration**: ${days} days (${startDate} to ${endDate})
- **Preferences**: ${preferences || 'No special preference'}

## ✈️ Transportation Suggestion
- What is the most suitable way to travel from ${fromCity} to ${toCity}? Should the traveler take a flight, train, or drive?
- Include approximate travel time, cost, and recommendations.

## 📅 Daily Itinerary (Use Markdown formatting)
For each day, structure like this:

### 🗓️ Day X: [e.g., June 6]
- **Weather Forecast**: (Realistic and concise)
- **Suggested Clothing**: (Practical tips based on weather)
- **Recommended Hotel**: Name + reason + budget level

#### **🚌 Morning [8:00–11:30]**
- **[Attraction Name]**: Bold name + location + short but vivid description (what it is, why it's worth visiting)

#### **🍽️ Lunch [12:00–13:30]**
- **[Restaurant Name]**: Add local dishes to try + vibe

#### **🌇 Afternoon [14:00–17:00]**
- 1-2 **clearly named attractions**, each with:
  - Name (bold)
  - Type (e.g., museum, garden, hike)
  - Highlights (what to do or see)

#### **🌃 Evening [17:30–21:00]**
- Activities like night market, sunset points, or cafes
- Mention estimated time & tips (e.g., best photo spots)

#### **🎉 Optional Fun**
- Escape rooms, cooking classes, boat rides, etc. Add a location and cost estimate if possible

---

## ✅ Summary Section
- 🏨 **Recommended Hotels**
- 🍽️ **Food to Try**
- 🎒 **Packing Tips**
- 📌 **Must-Do Highlights**

## ✅ Markdown Output Formatting
- Use **bold titles**, **line breaks**, **bullet points**, and **emojis**
- Avoid paragraphs of plain text
- Structure should be clear, scannable, and informative

Make sure to bold all attraction names and format the output with headings, bullet points, and emojis. Avoid plain text blocks.

Now, return the final result as a single **JSON object** in the following structure:

{
  "markdown": "[The full Markdown-formatted itinerary above as a markdown-formatted string.]",
  "schedule": [
    {
      "date": "2025-06-06",
      "weekday": "Friday",
      "items": [
        {
          "period": "Morning",
          "timeRange": "08:00–11:30",
          "activities": [
            {
              "title": "West Lake",
              "description": "Scenic walk with lake view",
              "duration": "2 hours"
            }
          ]
        },
        {
          "period": "Lunch",
          "timeRange": "12:00–13:30",
          "activities": [
            {
              "title": "Lotus Garden Restaurant",
              "description": "Local dishes and lake view",
              "duration": "1.5 hours"
            }
          ]
        },
        {
          "period": "Afternoon",
          "timeRange": "14:00–17:00",
          "activities": [
            {
              "title": "Tea Museum",
              "description": "Explore Chinese tea culture",
              "duration": "1.5 hours"
            }
          ]
        },
        {
          "period": "Evening",
          "timeRange": "17:30–21:00",
          "activities": [
            {
              "title": "Night Market",
              "description": "Food, shopping, and music",
              "duration": "2 hours"
            }
          ]
        }
      ]
    }
  ]
}

⚠️ Rules:
- Each **day** must include the following **4 periods** (if applicable):

  1. Morning (08:00–11:30)  
  2. Lunch (12:00–13:30)  
  3. Afternoon (14:00–17:00)  
  4. Evening (17:30–21:00)  

- You must **include all 4 periods in the schedule array**, even if you only have placeholders or one activity.
- Do **not merge** meals into other periods like “Afternoon” — keep them separate.
- Each **period** must include at least **1 activity**.
- If you cannot think of real data, generate realistic placeholders.
- Return only the JSON. No markdown formatting, no triple backticks.

⚠️ VERY IMPORTANT: 
The markdown field must contain the full detailed markdown-formatted itinerary. 
Do not say "See above" or "See markdown section". 
Insert the real content.

`;



  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are an enthusiastic and friendly tourism planning assistant." },
      { role: "user", content: prompt },
    ],
  });

const raw = completion.choices[0].message.content;
console.log("🔍 Raw AI output:\n", raw);
// 👇 提取 ```json ... ``` 中的 JSON 块（如果存在）
const match = raw.match(/```json\s*([\s\S]+?)\s*```/);

let jsonString = raw;

if (match) {
  console.warn("⚠️ Detected code block, extracting JSON...");
  jsonString = match[1];
}

try {
  const parsed = JSON.parse(jsonString);
  return parsed;
} catch (err) {
  console.error("❌ Failed to parse AI JSON:", err.message);
  console.error("Raw AI output was:\n", raw);
  throw new Error("AI did not return valid JSON.");
}

};
