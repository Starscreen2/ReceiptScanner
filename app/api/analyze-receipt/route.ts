import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Improved prompt with more specific instructions and examples
    const prompt = `
      Analyze this receipt text and organize it into a structured format.
      
      RECEIPT TEXT:
      ${text}
      
      INSTRUCTIONS:
      1. Extract the following information in a clean, structured JSON format:
         - merchant: The store or business name
         - date: The purchase date in YYYY-MM-DD format (if unclear, use "Unknown")
         - total: The total amount as a number (without currency symbols)
         - items: An array of purchased items, each with:
           * name: Item description
           * price: Numeric price (without currency symbols)
           * quantity: Numeric quantity if available
         - paymentMethod: Method of payment (credit, cash, etc.)
         - taxes: Format as an array of objects, each with "type" and "amount" as a number
         - discounts: Format as an array of objects, each with "type" and "amount" as a number
      
      2. For prices, taxes, and discounts:
         - Extract numeric values only (remove $ or other currency symbols)
         - If a value is a percentage, convert it to its decimal equivalent
         - If a value cannot be determined, use null instead of leaving it blank
      
      3. For dates:
         - Try to standardize in YYYY-MM-DD format
         - If only partial date information is available, make your best guess
         - If completely unclear, use "Unknown"
      
      4. For items:
         - Separate distinct items even if formatting is unclear
         - Include quantity if available
         - Extract price as a numeric value
      
      EXAMPLE OUTPUT FORMAT:
      {
        "merchant": "Store Name",
        "date": "2023-04-15",
        "total": 42.99,
        "items": [
          {
            "name": "Product Name",
            "price": 12.99,
            "quantity": 2
          }
        ],
        "paymentMethod": "Credit Card",
        "taxes": [
          {
            "type": "Sales Tax",
            "amount": 3.45
          }
        ],
        "discounts": [
          {
            "type": "Member Discount",
            "amount": 5.00
          }
        ]
      }
      
      Return ONLY the JSON object without any additional text, markdown formatting, or code blocks.
    `

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY || "",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more deterministic results
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Gemini API error:", errorData)
      return NextResponse.json({ error: "Failed to analyze receipt" }, { status: response.status })
    }

    const data = await response.json()

    // Extract the text from Gemini's response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Try to parse the JSON from the text response
    let parsedData
    try {
      // Clean up the response to handle potential formatting issues
      const cleanedText = generatedText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim()

      parsedData = JSON.parse(cleanedText)

      // Process the data to ensure proper formatting
      if (parsedData) {
        // Ensure taxes is an array of objects
        if (parsedData.taxes && !Array.isArray(parsedData.taxes)) {
          if (typeof parsedData.taxes === "object") {
            parsedData.taxes = [parsedData.taxes]
          } else {
            parsedData.taxes = []
          }
        }

        // Ensure discounts is an array of objects
        if (parsedData.discounts && !Array.isArray(parsedData.discounts)) {
          if (typeof parsedData.discounts === "object") {
            parsedData.discounts = [parsedData.discounts]
          } else {
            parsedData.discounts = []
          }
        }

        // Ensure items is an array
        if (parsedData.items && !Array.isArray(parsedData.items)) {
          parsedData.items = [parsedData.items]
        }
      }
    } catch (e) {
      console.error("Failed to parse JSON from Gemini response:", e)
      // Return the raw text if JSON parsing fails
      return NextResponse.json({
        raw: generatedText,
        error: "Could not parse structured data",
      })
    }

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

