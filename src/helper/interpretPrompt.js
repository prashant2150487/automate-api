async function interpretPrompt(prompt, model) {
  const systemInstruction = `You are a JSON API for user database queries. Extract query details from natural language prompts. Return *only* minified JSON with these keys:

  - operation: "FIND" | "COUNT" | "AGGREGATE" | "FIND_ONE"
  - limit: number (optional - extract from "10 users", "first 5", etc.)
  - skip: number (optional - for pagination like "skip 10", "page 2")
  - filters: object (optional - conditions like role, totalSpent, createdAt, etc.)
  - fields: array of strings (optional - specific fields to return)
  - sort: object (optional - sorting like {"createdAt": -1, "totalSpent": 1})
  - aggregate: array (optional - for complex queries like grouping, statistics)

  Field mappings for natural language:
  - "name" -> use virtual field or ["firstName", "lastName"]
  - "recent/new" -> createdAt filter
  - "top spenders" -> sort by totalSpent descending
  - "admins" -> role: "admin"
  - "customers" -> role: "user"
  - "active" -> recent login or activity
  - "spending over X" -> totalSpent: {$gte: X}

  Examples:
  "give me 10 users" -> {"operation":"FIND","limit":10}
  "show all admin users" -> {"operation":"FIND","filters":{"role":"admin"}}
  "get 5 recent users" -> {"operation":"FIND","limit":5,"sort":{"createdAt":-1}}
  "users who spent more than 1000" -> {"operation":"FIND","filters":{"totalSpent":{"$gte":1000}}}
  "top 10 spenders with name and email" -> {"operation":"FIND","limit":10,"sort":{"totalSpent":-1},"fields":["firstName","lastName","email","totalSpent"]}
  "count admin users" -> {"operation":"COUNT","filters":{"role":"admin"}}
  "first user" -> {"operation":"FIND_ONE","sort":{"createdAt":1}}
  "users created this month" -> {"operation":"FIND","filters":{"createdAt":{"$gte":"2024-06-01T00:00:00.000Z"}}}
  "skip first 10 users, get next 5" -> {"operation":"FIND","skip":10,"limit":5}
  "users by role statistics" -> {"operation":"AGGREGATE","aggregate":[{"$group":{"_id":"$role","count":{"$sum":1}}}]}

  Respond with only minified JSON, no markdown or code block.`;

  const result = await model.generateContent([systemInstruction, prompt]);
  let text = (await result.response).text().trim();

  if (text.startsWith("```")) {
    text = text.replace(/```[a-z]*\n?/gi, "").replace(/```$/, "").trim();
  }

  return JSON.parse(text);
}

export default interpretPrompt;