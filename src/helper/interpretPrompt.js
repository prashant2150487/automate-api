// filepath: /home/lucentinnovation/Desktop/AutomateCouponCode/automate-backend/src/helper/interpretPrompt.js
/* ----------  Helper: Parse vendor prompt with Gemini  ---------- */
async function interpretPrompt(prompt, model) {
  const systemInstruction = `You are a JSON API. Extract coupon campaign details from a vendor prompt in Indian Rupees. Return *only* minified JSON with these keys:
  - amount (number, rupees)
  - target ("NEW_CUSTOMERS" | "TOTAL_SPENT_MIN")
  - minPurchase (number, rupees, optional; required when target=TOTAL_SPENT_MIN)
  Respond with only minified JSON, no markdown or code block.`;

  const result = await model.generateContent([systemInstruction, prompt]);
  let text = (await result.response).text().trim();

  // Remove code block markers if present
  if (text.startsWith("```")) {
    text = text.replace(/```[a-z]*\n?/gi, "").replace(/```$/, "").trim();
  }

  return JSON.parse(text);
}
export default interpretPrompt;