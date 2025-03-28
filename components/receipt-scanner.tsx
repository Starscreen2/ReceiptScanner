"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"
import * as Tesseract from "tesseract.js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define types for the structured receipt data
interface ReceiptItem {
  name: string
  price?: string | number | { type?: string; amount?: number }
  quantity?: number
}

interface DiscountItem {
  type?: string
  amount?: number | string
}

interface StructuredReceipt {
  merchant?: string
  date?: string
  total?: string | number | { type?: string; amount?: number }
  items?: ReceiptItem[]
  paymentMethod?: string
  taxes?: Array<{ type?: string; amount?: number | string }> | string | number
  discounts?: Array<{ type?: string; amount?: number | string }> | string | number
  raw?: string
  error?: string
}

// Helper function to safely format values that might be objects
const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "-"
  }

  // Handle arrays (like taxes and discounts)
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item.type && item.amount !== undefined) {
          return `${item.type}: ${typeof item.amount === "number" ? item.amount.toFixed(2) : item.amount}`
        }
        return JSON.stringify(item)
      })
      .join(", ")
  }

  if (typeof value === "object") {
    // Handle common price/amount object formats
    if (value.amount !== undefined) {
      let formattedAmount = typeof value.amount === "number" ? value.amount.toFixed(2) : value.amount

      // Add currency symbol if available
      if (value.type) {
        if (value.type === "USD") {
          formattedAmount = `$${formattedAmount}`
        } else {
          formattedAmount = `${formattedAmount} ${value.type}`
        }
      }

      return String(formattedAmount)
    }

    // Fallback for other object types
    return JSON.stringify(value)
  }

  // Format numbers with 2 decimal places
  if (typeof value === "number") {
    return value.toFixed(2)
  }

  return String(value)
}

// Helper function to calculate total discounts
const calculateTotalDiscounts = (discounts: any): number => {
  if (!discounts) return 0

  if (Array.isArray(discounts)) {
    return discounts.reduce((total, discount) => {
      const amount = typeof discount.amount === "number" ? discount.amount : Number.parseFloat(discount.amount) || 0
      return total + amount
    }, 0)
  }

  if (typeof discounts === "object" && discounts.amount !== undefined) {
    return typeof discounts.amount === "number" ? discounts.amount : Number.parseFloat(discounts.amount) || 0
  }

  if (typeof discounts === "number") {
    return discounts
  }

  return 0
}

export default function ReceiptScanner() {
  const [image, setImage] = useState<string | null>(null)
  const [text, setText] = useState<string>("")
  const [progress, setProgress] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [structuredData, setStructuredData] = useState<StructuredReceipt | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processImage = async (file: File) => {
    try {
      setIsProcessing(true)
      setProgress(0)
      setStructuredData(null)

      // Use the Tesseract.recognize method with improved configuration
      Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const newProgress = Math.round(m.progress * 100)
            setTimeout(() => setProgress(newProgress), 0)
          }
        },
        // Add improved OCR configuration
        tessedit_char_whitelist:
          "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$%&*()_+-=[]{}|;:,./<>?@#\"' ",
        tessedit_pageseg_mode: "6", // Assume a single uniform block of text
        preserve_interword_spaces: "1",
        tessjs_create_hocr: "0",
        tessjs_create_tsv: "0",
      })
        .then((result) => {
          // Extract text from result
          const extractedText = result.data.text
          setText(extractedText)
          setProgress(100)

          // Automatically analyze the text if it's not empty
          if (extractedText.trim()) {
            analyzeReceiptText(extractedText)
          }
        })
        .catch((err) => {
          console.error("OCR Error:", err)
          setError("Error processing image. Please try again.")
        })
        .finally(() => {
          setIsProcessing(false)
        })
    } catch (err) {
      console.error("OCR Error:", err)
      setError("Error processing image. Please try again.")
      setIsProcessing(false)
    }
  }

  const analyzeReceiptText = async (textToAnalyze: string) => {
    try {
      setIsAnalyzing(true)
      setError(null)

      const response = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textToAnalyze }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setStructuredData(data)
    } catch (err) {
      console.error("Analysis Error:", err)
      setError("Failed to analyze receipt. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset states
    setText("")
    setError(null)
    setProgress(0)
    setStructuredData(null)

    // Validate file type
    const validTypes = ["image/jpeg", "image/png"]
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPG or PNG)")
      return
    }

    // Create file preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Process the image with OCR
    processImage(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleManualAnalysis = () => {
    if (text.trim()) {
      analyzeReceiptText(text)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <div
              className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer mb-4 hover:bg-gray-50 transition-colors"
              onClick={triggerFileInput}
            >
              <div className="text-center p-4">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Click to upload a receipt image</p>
                <p className="text-xs text-gray-500">(JPG or PNG)</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png"
                className="hidden"
              />
            </div>

            <Button onClick={triggerFileInput} className="mb-6" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Upload Receipt"}
            </Button>

            {error && <div className="text-red-500 mb-4 text-center w-full">{error}</div>}

            {isProcessing && (
              <div className="w-full mb-6">
                <p className="text-sm text-gray-600 mb-2 text-center">Processing receipt... {progress}%</p>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {image && (
              <div className="w-full mb-6">
                <h3 className="text-lg font-medium mb-2">Receipt Image</h3>
                <div className="relative w-full h-64 md:h-80 border rounded-lg overflow-hidden">
                  <Image src={image || "/placeholder.svg"} alt="Receipt" fill className="object-contain" />
                </div>
              </div>
            )}

            {text && (
              <div className="w-full">
                <Tabs defaultValue="structured" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="structured">Structured Data</TabsTrigger>
                    <TabsTrigger value="raw">Raw Text</TabsTrigger>
                  </TabsList>

                  <TabsContent value="structured" className="mt-4">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-sm text-gray-600">Analyzing receipt with AI...</p>
                      </div>
                    ) : structuredData ? (
                      <div className="space-y-4">
                        {structuredData.merchant && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-500">Merchant</h4>
                            <p className="text-lg">{structuredData.merchant}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4">
                          {structuredData.date && (
                            <div className="min-w-[120px]">
                              <h4 className="font-medium text-sm text-gray-500">Date</h4>
                              <p>{structuredData.date}</p>
                            </div>
                          )}

                          {structuredData.total !== undefined && (
                            <div className="min-w-[120px]">
                              <h4 className="font-medium text-sm text-gray-500">Total</h4>
                              <p className="font-bold">{formatValue(structuredData.total)}</p>
                            </div>
                          )}

                          {structuredData.paymentMethod && (
                            <div className="min-w-[120px]">
                              <h4 className="font-medium text-sm text-gray-500">Payment Method</h4>
                              <p>{structuredData.paymentMethod}</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium text-sm text-gray-500 mb-2">Items</h4>
                          {structuredData.items && structuredData.items.length > 0 ? (
                            <div className="bg-gray-50 rounded-md border">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Item
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {structuredData.items.map((item, index) => (
                                    <tr key={index}>
                                      <td className="px-4 py-2 whitespace-normal text-sm text-gray-900">
                                        {item.name}
                                        {item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ""}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                        {item.price !== undefined ? formatValue(item.price) : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No items found</p>
                          )}
                        </div>

                        {/* Discounts section - now placed under items */}
                        {structuredData.discounts && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-2">Discounts</h4>
                            <div className="bg-gray-50 rounded-md border">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Discount
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Amount
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {Array.isArray(structuredData.discounts) ? (
                                    structuredData.discounts.map((discount, index) => (
                                      <tr key={index}>
                                        <td className="px-4 py-2 whitespace-normal text-sm text-gray-900">
                                          {discount.type || "Discount"}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 text-right">
                                          -
                                          {typeof discount.amount === "number"
                                            ? discount.amount.toFixed(2)
                                            : discount.amount}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td className="px-4 py-2 whitespace-normal text-sm text-gray-900">Discount</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 text-right">
                                        {formatValue(structuredData.discounts)}
                                      </td>
                                    </tr>
                                  )}

                                  {/* Total discounts row */}
                                  {Array.isArray(structuredData.discounts) && structuredData.discounts.length > 1 && (
                                    <tr className="bg-gray-50">
                                      <td className="px-4 py-2 whitespace-normal text-sm font-medium text-gray-900">
                                        Total Discounts
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                        -{calculateTotalDiscounts(structuredData.discounts).toFixed(2)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Taxes section */}
                        {structuredData.taxes && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-2">Taxes</h4>
                            <div className="bg-gray-50 rounded-md border">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Tax
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Amount
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {Array.isArray(structuredData.taxes) ? (
                                    structuredData.taxes.map((tax, index) => (
                                      <tr key={index}>
                                        <td className="px-4 py-2 whitespace-normal text-sm text-gray-900">
                                          {tax.type || "Tax"}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                          {typeof tax.amount === "number" ? tax.amount.toFixed(2) : tax.amount}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td className="px-4 py-2 whitespace-normal text-sm text-gray-900">Tax</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                        {formatValue(structuredData.taxes)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No structured data available yet.</p>
                        <Button onClick={handleManualAnalysis} disabled={!text || isAnalyzing}>
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            "Analyze with AI"
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="raw" className="mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap font-mono text-sm">
                      {text || "No text extracted yet."}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

