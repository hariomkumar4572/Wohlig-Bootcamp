
import json
from pathlib import Path

import pymupdf


BASE_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = BASE_DIR / "samples"
GROUND_TRUTH_FILE = BASE_DIR / "ground_truth.jsonl"

SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


# Predefined synthetic invoices.
# These values are our independent ground truth.
INVOICES = [
    {
        "invoice_number": "INV-2026-001",
        "invoice_date": "2026-11-01",
        "due_date": "2026-11-15",
        "seller_name": "TechNova Solutions",
        "buyer_name": "Alpha Enterprises",
        "billing_address": {
            "street": "12 Park Street",
            "city": "Kolkata",
            "state": "West Bengal",
            "postal_code": "700016",
            "country": "India"
        },
        "line_items": [
            {"description": "Laptop", "quantity": 2, "unit_price": 50000.0, "amount": 100000.0},
            {"description": "Wireless Mouse", "quantity": 5, "unit_price": 500.0, "amount": 2500.0}
        ],
        "payment_status": "PAID",
        "currency": "INR",
        "subtotal": 102500.0,
        "tax_amount": 18450.0,
        "total_amount": 120950.0
    },
    {
        "invoice_number": "INV-2026-002",
        "invoice_date": "2026-11-02",
        "due_date": "2026-11-20",
        "seller_name": "Digital World Pvt Ltd",
        "buyer_name": "Bright Future Academy",
        "billing_address": {
            "street": "45 MG Road",
            "city": "Patna",
            "state": "Bihar",
            "postal_code": "800001",
            "country": "India"
        },
        "line_items": [
            {"description": "Desktop Computer", "quantity": 3, "unit_price": 35000.0, "amount": 105000.0},
            {"description": "Keyboard", "quantity": 3, "unit_price": 800.0, "amount": 2400.0}
        ],
        "payment_status": "UNPAID",
        "currency": "INR",
        "subtotal": 107400.0,
        "tax_amount": 19332.0,
        "total_amount": 126732.0
    },
    {
        "invoice_number": "INV-2026-003",
        "invoice_date": "2026-11-03",
        "due_date": None,
        "seller_name": "Office Supplies Hub",
        "buyer_name": "Green Valley School",
        "billing_address": {
            "street": "8 Station Road",
            "city": "Darbhanga",
            "state": "Bihar",
            "postal_code": "846004",
            "country": "India"
        },
        "line_items": [
            {"description": "Printer Paper Box", "quantity": 10, "unit_price": 350.0, "amount": 3500.0},
            {"description": "Pen Pack", "quantity": 20, "unit_price": 100.0, "amount": 2000.0}
        ],
        "payment_status": "PARTIALLY_PAID",
        "currency": "INR",
        "subtotal": 5500.0,
        "tax_amount": 990.0,
        "total_amount": 6490.0
    },
    {
        "invoice_number": "INV-2026-004",
        "invoice_date": "2026-11-04",
        "due_date": "2026-11-10",
        "seller_name": "CloudTech Services",
        "buyer_name": "NextGen Software",
        "billing_address": {
            "street": "21 Sector 5",
            "city": "Noida",
            "state": "Uttar Pradesh",
            "postal_code": "201301",
            "country": "India"
        },
        "line_items": [
            {"description": "Cloud Hosting", "quantity": 1, "unit_price": 12000.0, "amount": 12000.0},
            {"description": "Technical Support", "quantity": 2, "unit_price": 3000.0, "amount": 6000.0}
        ],
        "payment_status": "OVERDUE",
        "currency": "INR",
        "subtotal": 18000.0,
        "tax_amount": 3240.0,
        "total_amount": 21240.0
    },
    {
        "invoice_number": "INV-2026-005",
        "invoice_date": "2026-11-05",
        "due_date": "2026-11-25",
        "seller_name": "Creative Print House",
        "buyer_name": "Modern Marketing Agency",
        "billing_address": {
            "street": "Not provided",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400001",
            "country": "India"
        },
        "line_items": [
            {"description": "Brochure Printing", "quantity": 500, "unit_price": 12.0, "amount": 6000.0},
            {"description": "Business Cards", "quantity": 200, "unit_price": 5.0, "amount": 1000.0}
        ],
        "payment_status": "UNPAID",
        "currency": "INR",
        "subtotal": 7000.0,
        "tax_amount": 1260.0,
        "total_amount": 8260.0
    },
    {
        "invoice_number": "INV-2026-006",
        "invoice_date": "2026-11-06",
        "due_date": None,
        "seller_name": "SafeNet Technologies",
        "buyer_name": "Secure Business Group",
        "billing_address": {
            "street": "77 Park Avenue",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "country": "India"
        },
        "line_items": [
            {"description": "Firewall License", "quantity": 2, "unit_price": 8500.0, "amount": 17000.0},
            {"description": "Security Audit", "quantity": 1, "unit_price": 5000.0, "amount": 5000.0}
        ],
        "payment_status": "UNKNOWN",
        "currency": "INR",
        "subtotal": 22000.0,
        "tax_amount": 3960.0,
        "total_amount": 25960.0
    },
    {
        "invoice_number": "INV-2026-007",
        "invoice_date": "2026-11-07",
        "due_date": "2026-11-30",
        "seller_name": "EduTech Learning",
        "buyer_name": "Knowledge Point Institute",
        "billing_address": {
            "street": "15 Civil Lines",
            "city": "Jaipur",
            "state": "Rajasthan",
            "postal_code": "302001",
            "country": "India"
        },
        "line_items": [
            {"description": "Online Course License", "quantity": 10, "unit_price": 1500.0, "amount": 15000.0},
            {"description": "Study Material", "quantity": 10, "unit_price": 300.0, "amount": 3000.0}
        ],
        "payment_status": "PAID",
        "currency": "INR",
        "subtotal": 18000.0,
        "tax_amount": 3240.0,
        "total_amount": 21240.0
    },
    {
        "invoice_number": "INV-2026-008",
        "invoice_date": "2026-11-08",
        "due_date": "2026-11-18",
        "seller_name": "Logistics Express",
        "buyer_name": "National Retail Traders",
        "billing_address": {
            "street": "Not provided",
            "city": "Delhi",
            "state": "Delhi",
            "postal_code": None,
            "country": "India"
        },
        "line_items": [
            {"description": "Freight Charges", "quantity": 4, "unit_price": 2500.0, "amount": 10000.0},
            {"description": "Packaging Service", "quantity": 4, "unit_price": 500.0, "amount": 2000.0}
        ],
        "payment_status": "UNPAID",
        "currency": "INR",
        "subtotal": 12000.0,
        "tax_amount": 2160.0,
        "total_amount": 14160.0
    },
    {
        "invoice_number": "INV-2026-009",
        "invoice_date": "2026-11-09",
        "due_date": "2026-11-24",
        "seller_name": "DataPro Analytics",
        "buyer_name": "Insight Consulting",
        "billing_address": {
            "street": "33 Tech Park",
            "city": "Hyderabad",
            "state": "Telangana",
            "postal_code": "500081",
            "country": "India"
        },
        "line_items": [
            {"description": "Data Analysis Service", "quantity": 5, "unit_price": 4000.0, "amount": 20000.0},
            {"description": "Monthly Report", "quantity": 2, "unit_price": 1500.0, "amount": 3000.0}
        ],
        "payment_status": "PARTIALLY_PAID",
        "currency": "INR",
        "subtotal": 23000.0,
        "tax_amount": 4140.0,
        "total_amount": 27140.0
    },
    {
        "invoice_number": "INV-2026-010",
        "invoice_date": "2026-11-10",
        "due_date": "2026-12-10",
        "seller_name": "Hardware Solutions",
        "buyer_name": "Future Tech Industries",
        "billing_address": {
            "street": "90 Industrial Area",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411001",
            "country": "India"
        },
        "line_items": [
            {"description": "Network Switch", "quantity": 4, "unit_price": 6000.0, "amount": 24000.0},
            {"description": "Ethernet Cable", "quantity": 20, "unit_price": 150.0, "amount": 3000.0}
        ],
        "payment_status": "OVERDUE",
        "currency": "INR",
        "subtotal": 27000.0,
        "tax_amount": 4860.0,
        "total_amount": 31860.0
    }
]


def create_invoice_pdf(invoice, output_path):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    y = 55

    def write_line(text, size=10, bold=False):
        nonlocal y
        font = "hebo" if bold else "helv"
        page.insert_text(
            (50, y),
            str(text),
            fontsize=size,
            fontname=font,
            color=(0, 0, 0)
        )
        y += size + 10

    write_line("TAX INVOICE", 22, True)
    write_line("SYNTHETIC TRAINING DOCUMENT - NOT A REAL INVOICE", 8)
    y += 10

    write_line(f"Invoice Number: {invoice['invoice_number']}", 11, True)
    write_line(f"Invoice Date: {invoice['invoice_date']}")
    write_line(
        f"Due Date: {invoice['due_date'] or 'Not specified'}"
    )
    y += 10

    write_line(f"Seller: {invoice['seller_name']}", 11, True)
    write_line(f"Buyer: {invoice['buyer_name']}", 11, True)

    address = invoice["billing_address"]
    write_line("Billing Address:", 10, True)

    for key in ["street", "city", "state", "postal_code", "country"]:
        value = address.get(key)
        if value:
            write_line(f"{key.replace('_', ' ').title()}: {value}")

    y += 10
    write_line("LINE ITEMS", 13, True)

    for item in invoice["line_items"]:
        write_line(f"Description: {item['description']}")
        write_line(f"Quantity: {item['quantity']}")
        write_line(f"Unit Price: {item['unit_price']:.2f}")
        write_line(f"Amount: {item['amount']:.2f}")
        y += 3

    y += 10
    write_line(f"Currency: {invoice['currency']}", 10, True)
    write_line(f"Subtotal: {invoice['subtotal']:.2f}")
    write_line(f"Tax Amount: {invoice['tax_amount']:.2f}")
    write_line(f"Total Amount: {invoice['total_amount']:.2f}", 12, True)
    write_line(f"Payment Status: {invoice['payment_status']}", 11, True)

    page.insert_text(
        (50, 790),
        "Generated for document extraction practice",
        fontsize=8,
        color=(0.4, 0.4, 0.4)
    )

    doc.save(output_path)
    doc.close()


def main():
    ground_truth_records = []

    for index, invoice in enumerate(INVOICES, start=1):
        sample_id = f"invoice_{index:02d}"
        output_path = SAMPLES_DIR / f"{sample_id}.pdf"

        create_invoice_pdf(invoice, output_path)

        ground_truth_records.append({
            "sample_id": sample_id,
            "ground_truth": invoice
        })

        print(f"Created: {output_path.name}")

    with GROUND_TRUTH_FILE.open("w", encoding="utf-8") as file:
        for record in ground_truth_records:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")

    print("\nGeneration completed successfully.")
    print(f"Total invoices: {len(INVOICES)}")
    print(f"Ground truth: {GROUND_TRUTH_FILE}")


if __name__ == "__main__":
    main()
