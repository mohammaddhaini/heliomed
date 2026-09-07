import zipfile, xml.etree.ElementTree as ET, json, re, os

xlsx_path = r"C:\Users\dr laptop\Downloads\GMS_PRODUCTS.xlsx"
exclude_titles = {
    "rom elbow brace",
    "u gel seat cushion",
    "support stocking calypso (closed toe)"
}

with zipfile.ZipFile(xlsx_path, "r") as z:
    shared_strings = []
    if "xl/sharedStrings.xml" in z.namelist():
        tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
            t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
            if t is not None and t.text:
                shared_strings.append(t.text)
            else:
                text_parts = [t_node.text for t_node in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t") if t_node.text]
                shared_strings.append("".join(text_parts))

    sheet_tree = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    rows = sheet_tree.findall(f".//{ns}row")
    
    headers = {}
    for c in rows[0].findall(f"{ns}c"):
        val = c.find(f"{ns}v")
        val_str = val.text if val is not None else ""
        if c.get("t") == "s" and val_str.isdigit():
            val_str = shared_strings[int(val_str)]
        col_letter = "".join([ch for ch in c.get("r") if ch.isalpha()])
        headers[col_letter] = val_str

    parsed = []
    for r in rows[1:]:
        p_name = ""
        raw_price = ""
        for c in r.findall(f"{ns}c"):
            col_letter = "".join([ch for ch in c.get("r") if ch.isalpha()])
            h = headers.get(col_letter)
            val = c.find(f"{ns}v")
            val_str = val.text if val is not None else ""
            if c.get("t") == "s" and val_str.isdigit():
                val_str = shared_strings[int(val_str)]
            if h == "Product Name": p_name = val_str.strip()
            if h == "Price": raw_price = val_str.strip()
        
        if p_name.lower() in exclude_titles:
            new_price = ""
            new_price_val = None
        else:
            digits = re.sub(r"[^0-9]", "", raw_price)
            if digits:
                val = int(digits)
                new_price = f"${val}.00"
                new_price_val = val
            else:
                new_price = ""
                new_price_val = None
        
        parsed.append({
            "title": p_name,
            "raw_price": raw_price,
            "newPrice": new_price,
            "newPriceValue": new_price_val
        })

output_path = os.path.join(os.path.dirname(__file__), "gms-prices-map.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(parsed, f, indent=2, ensure_ascii=False)

print(f"Total parsed: {len(parsed)}")
priced = [p for p in parsed if p["newPriceValue"] is not None]
unpriced = [p for p in parsed if p["newPriceValue"] is None]
print(f"Priced: {len(priced)}, Unpriced: {len(unpriced)}")
print(f"Saved to {output_path}")
