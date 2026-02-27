# Finance Guardian - AI Invoice Auditor

**Mosaic Fellowship 2026 - Builder Round Submission**

## 🎯 Project Overview

Finance Guardian is an intelligent invoice auditing system that automatically reads invoices from any vendor, extracts financial data using OCR, cross-checks against contracts, and flags discrepancies and overcharges. Built to solve the real business problem of invoice overcharges that cost companies 5-10% of their invoice value.

## 🚀 Live Demo

**URL**: [Deploy your application here]

## 🏗️ Technology Stack

### Backend
- **Node.js + Express** - REST API server
- **Tesseract.js** - OCR for text extraction from PDFs and images
- **pdf-parse** - PDF text extraction
- **TypeScript** - Type-safe development

### Frontend
- **React + TypeScript** - Modern UI framework
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Professional UI components

### Deployment
- **Docker** - Containerized deployment
- **Docker Compose** - Multi-container orchestration
- **Health Checks** - Production monitoring

## ✨ Key Features

### 📄 Multi-Format Support
- **PDF Processing**: Extract text from PDF invoices
- **Image OCR**: Process JPG, PNG, scanned documents
- **Batch Upload**: Process multiple invoices simultaneously

### 🔍 Intelligent Validation
- **Line Item Verification**: Check quantity × rate = total calculations
- **Contract Rate Matching**: Compare against approved vendor rates
- **HSN Code Validation**: Verify GST HSN codes for compliance
- **Mystery Surcharge Detection**: Flag unknown fees and charges
- **Duplicate Invoice Detection**: Prevent duplicate payments

### 📊 Analytics & Reporting
- **Real-time Dashboard**: Track invoiced vs correct amounts
- **Vendor Risk Analysis**: Identify high-risk vendors
- **Overcharge Breakdown**: View recovery amounts by type
- **Audit Trail**: Complete history of all processed invoices

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd finance-guardian

# Install dependencies
npm install
cd server && npm install && cd ..

# Start development servers
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📡 API Endpoints

### Single Invoice Analysis
```http
POST /analyze
Content-Type: application/json

{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

### Batch Invoice Processing
```http
POST /analyze-batch
Content-Type: application/json

{
  "files": [
    {
      "fileName": "invoice1.pdf",
      "imageBase64": "data:application/pdf;base64,..."
    }
  ]
}
```

## 🧪 Sample Data Processing

The system processes invoices through these stages:

1. **Text Extraction**: OCR/PDF parsing to extract raw text
2. **Data Structuring**: Parse vendor, items, amounts, dates
3. **Validation Layer**: Cross-check against contracts and rules
4. **Anomaly Detection**: Flag discrepancies and overcharges
5. **Report Generation**: Create actionable audit reports

## 📈 Success Metrics

- ✅ **>95% Extraction Accuracy**: Reliable field extraction from invoices
- ✅ **Batch Processing**: Handle multiple invoices without manual intervention
- ✅ **Format Agnostic**: Works across different invoice layouts
- ✅ **Real-time Processing**: Process invoices in minutes, not days
- ✅ **Actionable Insights**: Clear explanations and recovery amounts

## 🏆 Mosaic Fellowship Impact

**Business Case**: On ₹50L/month in logistics spend, 5-10% overcharges = ₹2.5-5L/month recoverable

**Key Achievements**:
- Automated manual invoice checking process
- Reduced processing time from days to minutes
- Provided real-time visibility into invoice discrepancies
- Created scalable solution for vendor invoice management

## 🔧 Configuration

### Environment Variables
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5001
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### Contract Database
Vendor contracts and rates are configured in `server/routes/analyze.js`:
```javascript
const contractDB = {
  "bluedart logistics": {
    approvedRates: { "freight charges": 1400, ... },
    approvedGstRate: 18,
    hsnCodes: { "freight charges": "996511", ... }
  }
}
```

## 🚀 Deployment

### Quick Deploy (Docker)
```bash
docker-compose up -d
```

### Manual Deploy
```bash
# Install dependencies
npm install
cd server && npm install

# Start production server
npm run server
```

## 📞 Support

For questions about the Mosaic Fellowship submission or technical implementation:
- **Project Repository**: [GitHub URL]
- **Demo Video**: [Link to demo video]
- **Contact**: [Your contact information]

---

**Built with ❤️ for Mosaic Fellowship 2026**
