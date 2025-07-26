# Israeli Stocks Logo Management API

## Overview
Complete API endpoints for managing stock logos, perfect for admin panel integration.

## 🎯 **Available Endpoints**

### 1. **Bulk Logo Crawling**
```http
POST /api/v1/israeli-stocks/crawl-logos?batch_size=5
```
- **Description**: Crawl logos for all stocks that don't have them
- **Parameters**: 
  - `batch_size` (optional): Number of concurrent requests (default: 5)
- **Response**: Summary of crawling results
- **Use Case**: Initial setup or bulk updates

### 2. **Single Stock Logo Crawling** 🆕
```http
POST /api/v1/israeli-stocks/crawl-logo/{stock_name}
```
- **Description**: Crawl logo for a specific stock by name or symbol
- **Parameters**: 
  - `stock_name`: Stock name or symbol (e.g., "TEVA", "Bank Hapoalim")
- **Response**: Detailed result with stock information
- **Use Case**: Admin panel - manual logo fetching for individual stocks

### 3. **Manual Logo Upload** 🆕
```http
PUT /api/v1/israeli-stocks/stocks/{stock_id}/logo
```
- **Description**: Manually update a stock's logo with custom SVG content
- **Body**: 
  ```json
  {
    "svg_content": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
  }
  ```
- **Response**: Confirmation with stock details
- **Use Case**: Admin panel - when automatic crawling fails or custom logos needed

### 4. **Remove Logo** 🆕
```http
DELETE /api/v1/israeli-stocks/stocks/{stock_id}/logo
```
- **Description**: Remove a stock's logo (set to NULL)
- **Response**: Confirmation message
- **Use Case**: Admin panel - clean up bad or incorrect logos

### 5. **Get Stocks Without Logos**
```http
GET /api/v1/israeli-stocks/stocks-without-logos
```
- **Description**: List all stocks that don't have logos yet
- **Response**: Array of stocks with ID, symbol, name
- **Use Case**: Admin dashboard - see what needs attention

### 6. **Get Stocks With Logos**
```http
GET /api/v1/israeli-stocks/stocks-with-logos
```
- **Description**: List all stocks that have logos
- **Response**: Array of stocks with logo status
- **Use Case**: Admin dashboard - overview of completed work

## 📊 **Current Status**
- **185 total Israeli stocks** in database
- **105 stocks with logos** (56.8% coverage)
- **80 stocks without logos** (remaining)
- **All logos cleaned** (TradingView comments removed)

## 🛠️ **Technical Details**

### Logo Storage
- **Column**: `logo_svg` (TEXT) in `IsraeliStocks` table
- **Format**: Clean SVG content (no comments)
- **Source**: TradingView symbol logos
- **Validation**: Proper SVG format checking

### Error Handling
- **404**: Stock not found
- **400**: Invalid SVG format
- **403**: TradingView blocking (rate limiting)
- **500**: Database or network errors

### Rate Limiting
- **Batch crawling**: 3-5 concurrent requests with delays
- **Single requests**: 1-3 second delays between calls
- **Best practice**: Don't crawl too aggressively to avoid IP blocking

## 🎨 **Frontend Integration**

### Displaying Logos
```javascript
// In React/Next.js components
const LogoDisplay = ({ logoSvg, symbol }) => {
  if (!logoSvg) return <div className="placeholder">No Logo</div>;
  
  return (
    <div 
      className="logo-container"
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
};
```

### Admin Panel Features
1. **Logo Overview Dashboard**
   - Show coverage statistics
   - List stocks without logos
   - Bulk action buttons

2. **Individual Stock Management**
   - Search and select stocks
   - Preview current logo
   - Crawl/upload/remove buttons
   - Real-time status updates

3. **Bulk Operations**
   - Start bulk crawling
   - Progress tracking
   - Error reporting

## 🚀 **Next Steps**

1. **Build Admin Panel UI** with these endpoints
2. **Add logo validation** (size, dimensions)
3. **Implement caching** for frequently accessed logos
4. **Add backup logo sources** for better coverage
5. **Create logo quality scoring** system

## 🔐 **Authentication**
All endpoints require valid user authentication via the `current_user` dependency.

---

*Logo crawler service successfully implemented with 56.8% initial coverage! 🎉*
