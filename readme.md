https://scanner-receipt.vercel.app/

A modern web application that allows users to scan and analyze receipts using OCR (Optical Character Recognition) and AI. The app extracts text from receipt images and organizes the data into a structured format, making it easy to track expenses and manage financial records.

## Features

- **Image Upload**: Easily upload receipt images (JPG or PNG)
- **OCR Processing**: Extract text from receipt images using Tesseract.js
- **AI Analysis**: Analyze and structure receipt data using Google's Gemini AI
- **Structured Data Display**: View organized receipt information including:

- Merchant details
- Date of purchase
- Total amount
- Itemized list of purchases
- Tax information
- Discounts applied



- **Raw Text View**: Access the original extracted text if needed


## Technologies Used

- **Next.js**: React framework for the frontend and API routes
- **Tesseract.js**: OCR engine for text extraction from images
- **Google Gemini AI**: AI model for analyzing and structuring receipt data
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TypeScript**: Type-safe JavaScript for better development experience
- **Shadcn/UI**: Component library for UI elements


## Installation

1. Clone the repository:

```shellscript
git clone https://github.com/yourusername/receipt-scanner.git
cd receipt-scanner
```


2. Install dependencies:

```shellscript
npm install
```


3. Set up environment variables:
Create a `.env.local` file in the root directory and add your Gemini API key:

```plaintext
GEMINI_API_KEY=your_gemini_api_key
```


4. Run the development server:

```shellscript
npm run dev
```


5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.


## Usage

1. Click the upload area or the "Upload Receipt" button to select a receipt image
2. Wait for the OCR processing to complete (progress bar will show status)
3. The app will automatically analyze the extracted text using AI
4. View the structured data in the "Structured Data" tab
5. Switch to the "Raw Text" tab to see the original extracted text if needed


## How It Works

### OCR Processing

The application uses Tesseract.js to perform Optical Character Recognition on the uploaded receipt image. This process converts the image into text, which is then displayed in the "Raw Text" tab.

### AI Analysis

The extracted text is sent to Google's Gemini AI model through a secure API route. The AI analyzes the text and structures it into a JSON format containing:

- Merchant information
- Date of purchase
- Total amount
- Itemized list of purchases
- Payment method
- Tax information
- Discount information


### Data Display

The structured data is displayed in an organized format, making it easy to understand and use for expense tracking or record-keeping.

## Future Improvements

- Save receipts to a database for long-term storage
- Export receipt data to CSV or PDF
- User authentication for personal receipt management
- Receipt categorization and tagging
- Monthly/yearly expense reports and visualizations
- Mobile app version with camera integration
- Receipt sharing capabilities
- Integration with accounting software


## License

MIT License

---

Feel free to contribute to this project by submitting issues or pull requests!

