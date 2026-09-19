"""Seed demo data (PRD 61-62): products, aliases, unit conversions, sample txns."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import (
    Alias,
    Product,
    ProductUnit,
    Supplier,
    Transaction,
)

# Suppliers: name, phone, email, address, notes
_SEED_SUPPLIERS = [
    ("Sri Balaji Wholesale", "+91 90000 00001", "orders@balajiwholesale.example",
     "Market Road, Hyderabad", "Primary staples supplier (grains, flour)"),
    ("Agarwal Wholesale", "+91 98111 22334", "sales@agarwalwholesale.example",
     "Chandni Chowk, Delhi", "Essentials, sugar, salt and pulses"),
    ("Krishna Traders", "+91 97000 55667", "krishna@traders.example",
     "Wholesale Market, Vijayawada", "Edible oils and spices"),
    ("Anand Dairy", "+91 96500 88990", "supply@ananddairy.example",
     "Dairy Farm Road, Guntur", "Fresh dairy products"),
    ("SnackMart Distributors", "+91 98300 11223", "hello@snackmart.example",
     "Industrial Area, Hyderabad", "Snacks and beverages"),
]

# name, name_local, category, base_unit, default_unit, stock, min, critical,
# purchase_price, selling_price, avg_daily_usage, aliases, product_units, supplier
_SEED_PRODUCTS = [
    ("Sona Masoori Rice", "బియ్యం", "Grains", "kg", "kg", 125, 40, 15, 48, 62, 8,
     ["rice", "biyyam", "బియ్యం", "chawal", "sona rice", "sona masoori"],
     {"bag": 50.0}, "Sri Balaji Wholesale"),
    ("Basmati Rice", "बासमती", "Grains", "kg", "kg", 60, 20, 8, 90, 120, 3,
     ["basmati", "basmati rice", "long rice"], {"bag": 25.0}, "Sri Balaji Wholesale"),
    ("Wheat Flour", "గోధుమ పిండి", "Grains", "kg", "kg", 70, 25, 10, 32, 44, 6,
     ["wheat flour", "atta", "godhuma pindi", "wheat"], {"bag": 25.0}, "Sri Balaji Wholesale"),
    ("Poha", "అటుకులు", "Grains", "kg", "kg", 18, 8, 3, 40, 55, 2,
     ["poha", "atukulu", "flattened rice", "aval"], {"packet": 0.5}, "Sri Balaji Wholesale"),
    ("Semolina", "బొంబాయి రవ్వ", "Grains", "kg", "kg", 2, 8, 3, 36, 48, 2,
     ["semolina", "rava", "sooji", "ravva", "bombay rava"], {"packet": 0.5}, "Sri Balaji Wholesale"),
    ("Sugar", "చక్కెర", "Essentials", "kg", "kg", 8, 20, 10, 40, 48, 5,
     ["sugar", "cheeni", "చక్కెర", "chini", "shakkar"], {"bag": 50.0}, "Agarwal Wholesale"),
    ("Salt", "ఉప్పు", "Essentials", "kg", "kg", 45, 10, 4, 18, 24, 2,
     ["salt", "namak", "uppu", "ఉప్పు"], {"packet": 1.0}, "Agarwal Wholesale"),
    ("Jaggery", "బెల్లం", "Essentials", "kg", "kg", 14, 6, 2, 55, 75, 1.5,
     ["jaggery", "gud", "bellam", "బెల్లం"], {"packet": 0.5}, "Agarwal Wholesale"),
    ("Toor Dal", "కంది పప్పు", "Pulses", "kg", "kg", 30, 15, 6, 110, 135, 4,
     ["toor dal", "dal", "pappu", "kandi pappu", "दाल", "arhar"], {"bag": 30.0}, "Agarwal Wholesale"),
    ("Moong Dal", "పెసర పప్పు", "Pulses", "kg", "kg", 22, 12, 5, 120, 145, 3,
     ["moong dal", "pesara pappu", "moong", "green dal"], {}, "Agarwal Wholesale"),
    ("Chana Dal", "శనగ పప్పు", "Pulses", "kg", "kg", 2, 10, 4, 95, 120, 3,
     ["chana dal", "senaga pappu", "bengal gram", "chana"], {"bag": 30.0}, "Agarwal Wholesale"),
    ("Sunflower Oil", "నూనె", "Oils", "litre", "litre", 35, 15, 6, 130, 155, 4,
     ["oil", "sunflower oil", "noone", "tel", "నూనె"], {"carton": 12.0}, "Krishna Traders"),
    ("Groundnut Oil", "వేరుశనగ నూనె", "Oils", "litre", "litre", 20, 10, 4, 165, 195, 3,
     ["groundnut oil", "peanut oil", "verusenaga noone", "palli oil"], {"carton": 12.0}, "Krishna Traders"),
    ("Ghee", "నెయ్యి", "Oils", "litre", "litre", 6, 4, 1.5, 480, 560, 1,
     ["ghee", "neyyi", "నెయ్యి", "clarified butter"], {"packet": 0.5}, "Krishna Traders"),
    ("Turmeric Powder", "పసుపు", "Spices", "kg", "kg", 9, 4, 1.5, 180, 220, 0.5,
     ["turmeric", "haldi", "pasupu", "పసుపు"], {"packet": 0.1}, "Krishna Traders"),
    ("Chilli Powder", "కారం", "Spices", "kg", "kg", 7, 4, 1.5, 200, 250, 0.6,
     ["chilli powder", "mirchi", "karam", "కారం", "red chilli"], {"packet": 0.1}, "Krishna Traders"),
    ("Milk", "పాలు", "Dairy", "litre", "litre", 40, 20, 8, 48, 58, 15,
     ["milk", "paalu", "doodh", "పాలు"], {"packet": 0.5}, "Anand Dairy"),
    ("Curd", "పెరుగు", "Dairy", "kg", "kg", 12, 8, 3, 50, 70, 5,
     ["curd", "perugu", "dahi", "yogurt", "పెరుగు"], {"packet": 0.5}, "Anand Dairy"),
    ("Paneer", "పనీర్", "Dairy", "kg", "kg", 3, 5, 2, 260, 320, 2,
     ["paneer", "cottage cheese", "పనీర్"], {"packet": 0.2}, "Anand Dairy"),
    ("Tea", "టీ", "Beverages", "kg", "kg", 12, 5, 2, 220, 280, 1,
     ["tea", "chai", "టీ"], {"packet": 0.25}, "SnackMart Distributors"),
    ("Coffee", "కాఫీ", "Beverages", "kg", "kg", 6, 4, 1.5, 380, 450, 0.8,
     ["coffee", "kaapi", "కాఫీ"], {"packet": 0.2}, "SnackMart Distributors"),
    ("Biscuits", "బిస్కెట్లు", "Snacks", "packet", "packet", 120, 40, 15, 8, 12, 20,
     ["biscuits", "biscuit", "cookies"], {"box": 24.0, "carton": 96.0}, "SnackMart Distributors"),
    ("Namkeen Mixture", "మిక్చర్", "Snacks", "packet", "packet", 2, 20, 8, 18, 28, 6,
     ["namkeen", "mixture", "chips", "snacks"], {"box": 12.0}, "SnackMart Distributors"),
]


def seed(db: Session, *, force: bool = False) -> dict:
    if db.query(Product).count() > 0 and not force:
        return {"seeded": False, "reason": "products already exist"}

    suppliers_by_name: dict[str, Supplier] = {}
    for name, phone, email, address, notes in _SEED_SUPPLIERS:
        supplier = Supplier(
            name=name, phone=phone, email=email, address=address, notes=notes
        )
        db.add(supplier)
        db.flush()
        suppliers_by_name[name] = supplier

    created: list[Product] = []
    for (name, local, cat, base, default, stock, mn, crit, pp, sp, adu,
         aliases, units, supplier_name) in _SEED_PRODUCTS:
        supplier = suppliers_by_name.get(supplier_name)
        product = Product(
            name=name, name_local=local, category=cat,
            base_unit=base, default_unit=default,
            current_stock=float(stock), opening_stock=float(stock),
            min_stock=float(mn), critical_stock=float(crit),
            purchase_price=float(pp), selling_price=float(sp),
            avg_daily_usage=float(adu), reorder_quantity=float(mn) * 2,
            supplier_id=supplier.id if supplier else None,
        )
        db.add(product)
        db.flush()
        for a in aliases:
            db.add(Alias(product_id=product.id, alias=a))
        for unit, factor in units.items():
            db.add(ProductUnit(product_id=product.id, unit=unit, factor_to_base=factor))
        created.append(product)

    # A few historical transactions so analytics/history aren't empty.
    now = datetime.utcnow()
    rice = created[0]
    sugar = created[5]
    db.add(Transaction(product_id=rice.id, action="ADD", quantity=2, unit="bag",
                       normalized_quantity=100, stock_after=rice.current_stock,
                       source="MANUAL", reason="Opening purchase",
                       created_at=now - timedelta(days=3)))
    db.add(Transaction(product_id=sugar.id, action="REMOVE", quantity=5, unit="kg",
                       normalized_quantity=5, stock_after=sugar.current_stock,
                       source="VOICE", reason="Sale",
                       created_at=now - timedelta(days=1)))

    db.commit()
    return {"seeded": True, "products": len(created), "suppliers": len(suppliers_by_name)}
