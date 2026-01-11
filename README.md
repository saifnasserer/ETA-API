# ETA Invoicing Fetcher

This Node.js script fetches invoices from the Egyptian Tax Authority (ETA) API and saves them as JSON files.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Credentials**:
    - Rename `.env.example` to `.env` (already done).
    - Open `.env` and fill in `ETA_CLIENT_ID` and `ETA_CLIENT_SECRET`.

    ### How to get Client ID & Secret
    1.  Log in to the [ETA Portal](https://invoicing.eta.gov.eg/) (Production) or [Pre-production Portal](https://preprod.invoicing.eta.gov.eg/) using your credentials (`Admin@laapak.com` etc).
    2.  Navigate to **ERP System** or **Integration** section.
    3.  Register a new ERP System.
    4.  Copy the generated **Client ID** and **Client Secret**.

3.  **Run the Script**:
    
    **Fetch last 30 days** (default):
    ```bash
    node fetch_invoices.js
    ```
    
    **Fetch from a specific start date to today**:
    ```bash
    node fetch_invoices.js 2024-01-01
    ```
    
    **Fetch from a custom date range**:
    ```bash
    node fetch_invoices.js 2024-01-01 2024-12-31
    ```
    
    The script automatically handles the 30-day API limit by making multiple requests in chunks.

## Output

Invoices will be saved in the `invoices/` directory, named by their UUID (e.g., `invoices/123456...json`).
