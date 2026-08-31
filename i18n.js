(function () {
    "use strict";

    var STORAGE_KEY = "heliomed_lang";
    var FALLBACK_LANG = "en";
    var SUPPORTED = { en: true, ar: true };

    var messages = {
        en: {
            "lang.english": "EN",
            "lang.arabic": "عربي",
            "aria.openMenu": "Open menu",
            "aria.openSearch": "Open search",
            "aria.closeSearch": "Close search",
            "aria.language": "Language",
            "aria.closeMenu": "Close menu",
            "aria.account": "Account",
            "aria.openAccount": "Open account",
            "aria.wishlist": "Wishlist",
            "aria.openWishlist": "Open wishlist",
            "aria.shoppingCart": "Shopping Cart",
            "aria.productSuggestions": "Product suggestions",
            "aria.socialLinks": "Heliomed social links",
            "aria.facebook": "Heliomed on Facebook",
            "aria.linkedin": "Heliomed on LinkedIn",
            "aria.instagram": "Heliomed on Instagram",
            "aria.whatsapp": "Contact Heliomed on WhatsApp",
            "aria.breadcrumb": "Breadcrumb",
            "aria.collectionFilters": "Collection filters",
            "aria.sortProducts": "Sort products",
            "aria.collectionProducts": "Collection products",
            "aria.zoomProduct": "Zoom product image",
            "aria.quantitySelector": "Quantity selector",
            "aria.quantity": "Quantity",
            "aria.decreaseQuantity": "Decrease quantity",
            "aria.increaseQuantity": "Increase quantity",
            "aria.chooseRating": "Choose rating",
            "aria.productZoom": "Product image zoom",
            "aria.closeProductZoom": "Close image zoom",
            "aria.stickyCart": "Sticky add to cart",
            "aria.cartPanel": "Shopping Cart",
            "aria.closeCart": "Close cart panel",
            "aria.toggleWishlist": "Toggle wishlist",
            "aria.toggleSubcategories": "Toggle {name} subcategories",
            "nav.menu": "MENU",
            "nav.parapharmacy": "PARAPHARMACY",
            "nav.medicalSupplies": "MEDICAL SUPPLIES",
            "nav.organic": "ORGANIC",
            "nav.perfume": "PERFUME",
            "nav.makeup": "MAKEUP",
            "nav.offers": "OFFERS",
            "nav.blog": "BLOG",
            "nav.login": "LOGIN",
            "nav.wishlist": "WISHLIST",
            "nav.viewAll": "View all {name}",
            "nav.viewAllParapharmacy": "View all Parapharmacy",
            "nav.viewAllOrganic": "View All Organic",
            "nav.supports": "Supports",
            "nav.disposables": "Disposables",
            "nav.other": "Other",
            "nav.women": "Women",
            "nav.men": "Men",
            "nav.kids": "Kids",
            "nav.bundles": "Bundles",
            "nav.face": "Face",
            "nav.eye": "Eye",
            "nav.lips": "Lips",
            "nav.nail": "Nail",
            "nav.toolsAccessories": "Tools & Accessories",
            "nav.makeupRemover": "Makeup Remover",
            "nav.medicalMakeup": "Medical Makeup",
            "nav.palettes": "Palettes",
            "nav.koreanProducts": "Korean Products",
            "nav.skinCare": "Skin Care",
            "nav.hairCare": "Hair Care",
            "nav.faceCare": "Face Care",
            "nav.dentalCare": "Dental Care",
            "nav.bodyCare": "Body Care",
            "nav.nailCare": "Nail Care",
            "nav.footCare": "Foot Care",
            "nav.babyCare": "Baby Care",
            "nav.motherCare": "Mother Care",
            "nav.kidsCare": "Kids Care",
            "nav.menCare": "Men Care",
            "nav.geriatricCare": "Geriatric Care",
            "nav.nutrition": "Nutrition",
            "nav.supplements": "Supplements",
            "nav.ankleSupport": "Ankle Support",
            "nav.backSupport": "Back Support",
            "nav.cervicalSupport": "Cervical Support",
            "nav.diskTrac": "Disk Trac",
            "nav.kneeSupport": "Knee Support",
            "nav.orthopedic": "Orthopedic",
            "nav.shoulderElbow": "Shoulder & Elbow",
            "nav.wristHand": "Wrist & Hand Braces",
            "nav.gloves": "Gloves",
            "nav.gauze": "Gauze",
            "nav.needles": "Needles",
            "nav.sutures": "Sutures",
            "nav.blades": "Blades",
            "nav.woundCare": "Wound Care",
            "nav.drapes": "Drapes / Apparel",
            "nav.homeCare": "Home Care",
            "nav.liposuction": "Liposuction",
            "nav.pediatric": "Pediatric",
            "nav.vascular": "Vascular",
            "nav.pillows": "Pillows",
            "search.placeholder": "Search products...",
            "search.placeholderForProducts": "Search for products",
            "search.filters": "Filters",
            "search.closeFilters": "Close filters",
            "search.inputPlaceholder": "SEARCH",
            "search.searchProducts": "Search products",
            "search.clearSearch": "Clear search",
            "search.viewResults": "View results",
            "search.activeFilters": "Active filters",
            "search.searchResults": "Search results",
            "search.empty": "No products matched that search.",
            "search.popularSearches": "Popular Searches",
            "search.categories": "Categories:",
            "search.termLabel": "Search",
            "loader.label": "Loading Heliomed storefront",
            "loader.title": "Preparing Heliomed",
            "loader.copy": "Loading care picks, categories, and featured products...",
            "hero.kicker": "Heliomed Essentials",
            "hero.title": "Care You Can Trust at Home",
            "hero.copy": "Daily Paraparapharmacy, beauty, wellness, and recovery essentials organized for fast decisions.",
            "hero.shopDailyCare": "Shop Daily Care",
            "footer.shop": "Shop",
            "footer.vitamins": "Vitamins & Supplements",
            "footer.skincare": "Skincare",
            "footer.medicalSupplies": "Medical Supplies",
            "footer.support": "Support",
            "footer.trackOrder": "Track My Order",
            "footer.myAccount": "My Account",
            "footer.care": "Heliomed Care",
            "footer.careCopy": "Paraparapharmacy & healthcare store serving all regions of Lebanon with authentic products.",
            "footer.whatsapp": "Direct WhatsApp",
            "footer.whatsappCta": "Connect with our specialists →",
            "footer.logoSub": "trusted Paraparapharmacy care",
            "footer.rights": "All Rights Reserved © 2026 Heliomed",
            "collection.home": "Home",
            "collection.label": "Collection",
            "collection.copy": "Browse Heliomed products.",
            "collection.productsFound": "products found",
            "collection.brand": "Brand",
            "collection.category": "Category",
            "collection.section": "Section",
            "collection.offer": "Offer",
            "collection.price": "Price",
            "collection.min": "Min",
            "collection.max": "Max",
            "collection.clearFilters": "Clear filters",
            "collection.sort": "Sort",
            "collection.sortAz": "A to Z",
            "collection.sortZa": "Z to A",
            "collection.sortPriceAsc": "Price: low to high",
            "collection.sortPriceDesc": "Price: high to low",
            "collection.loading": "Loading products...",
            "collection.loadMore": "Load more",
            "collection.empty": "No products matched this collection.",
            "collection.related": "Related Collections",
            "collection.couldNotLoad": "Could not load products.",
            "collection.productCount": "{count} product",
            "collection.productCount_plural": "{count} products",
            "product.products": "Products",
            "product.detail": "Product detail",
            "product.notFound": "Product not found. Go back to products and choose another item.",
            "product.noReviewsYet": "No reviews yet",
            "product.size": "Size",
            "product.option": "Option",
            "product.sizeGuide": "Size guide",
            "product.addToCart": "Add to cart",
            "product.buyNow": "Buy now",
            "product.cashDelivery": "Cash on Delivery available",
            "product.whish": "Whish payment available at checkout",
            "product.details": "Details",
            "product.usage": "Usage",
            "product.warnings": "Warnings",
            "product.reviews": "Reviews",
            "product.writeReview": "Write a review",
            "product.reviewEligibilityDefault": "Sign in to check whether this product is ready for review.",
            "product.yourName": "Your name",
            "product.yourReview": "Your review",
            "product.submitReview": "Submit review",
            "product.updateReview": "Update review",
            "product.youMayLike": "You May Also Like",
            "product.viewProducts": "View products",
            "product.moreFromBrand": "More From This Brand",
            "product.moreFrom": "More From {brand}",
            "product.viewBrand": "View brand",
            "product.stickyProduct": "Product",
            "product.add": "Add",
            "product.now": "Now: {price}",
            "product.msrp": "MSRP: {price}",
            "product.saveToday": "Save {discount}% today",
            "product.everydayPricing": "Everyday care pricing",
            "product.imageComingSoon": "Image coming soon",
            "product.inStock": "In stock",
            "product.outOfStock": "Out of stock",
            "product.review": "{count} review",
            "product.review_plural": "{count} reviews",
            "product.basedOnReviews": "Based on {count} customer review.",
            "product.basedOnReviews_plural": "Based on {count} customer reviews.",
            "product.verifiedPurchase": "Verified purchase",
            "product.firstReview": "Be the first to review this product.",
            "product.signInToReview": "Sign in to review products you purchased after their order is marked Delivered / paid.",
            "product.checkingOrders": "Checking your delivered orders...",
            "product.purchaseFirst": "You can review this product after purchasing it and after the order is marked Delivered / paid.",
            "product.verifiedCanUpdate": "Verified purchase. You can update your review.",
            "product.verifiedCanReview": "Verified purchase. Your delivered order allows you to review this product.",
            "product.couldNotCheckOrders": "Could not check your delivered orders right now. Please try again later.",
            "product.couldNotLoadProduct": "Could not load this product right now.",
            "product.addedToCart": "{title} added to cart.",
            "product.reviewDeliveredOnly": "Only delivered purchases can be reviewed.",
            "product.reviewUpdated": "Review updated.",
            "product.reviewSubmitted": "Review submitted.",
            "product.reviewSaveError": "Could not save your review.",
            "product.stars": "{count} stars",
            "product.defaultDescription": "{title} from {brand}, selected for Heliomed care routines.",
            "product.defaultUsage": "Use as directed on the product packaging or as recommended by your healthcare professional.",
            "product.defaultWarnings": "Read the label before use. Keep out of reach of children. Ask a healthcare professional if you are unsure whether this product is suitable for you.",
            "product.sizeGuideSupport": "Measure the body area comfortably, then choose the size that matches the product pack. If you are between sizes, choose the larger support for comfort.",
            "product.sizeGuideSkincare": "Size refers to pack volume. Choose smaller sizes for trial or travel, and larger sizes for daily routines.",
            "product.sizeGuideSupplement": "Size refers to capsule, tablet, or serving count. Check suggested use before choosing the pack.",
            "product.sizeGuideDefault": "Choose the option that matches the product packaging. Confirm directions and size details on the label before use.",
            "card.details": "Details",
            "card.add": "Add",
            "card.added": "Added",
            "card.noProductsBrand": "No products available for this brand.",
            "card.noProductsCollection": "No products found in this collection.",
            "card.shopCollection": "Shop Collection",
            "card.shopNow": "Shop Now",
            "card.showAllIn": "Show all in {name}",
            "card.addedToCart": "{title} added to cart.",
            "card.addedToWishlist": "{title} added to wishlist.",
            "card.removedFromWishlist": "{title} removed from wishlist.",
            "cart.title": "Your Cart",
            "cart.subtotal": "Subtotal",
            "cart.note": "Taxes and shipping calculated at checkout.",
            "cart.goToCart": "Go to cart",
            "cart.checkout": "Proceed to checkout",
            "cart.freeOver": "Free delivery on orders over",
            "cart.freeUnlocked": "You have unlocked",
            "cart.freeDelivery": "FREE Delivery",
            "cart.addMore": "Add",
            "cart.moreForFree": "more for",
            "cart.freeOverAmount": "Free delivery on orders over {amount}",
            "cart.freeUnlockedFull": "You have unlocked FREE Delivery!",
            "cart.addMoreFull": "Add {amount} more for FREE Delivery!",
            "cart.emptyTitle": "Your cart is empty",
            "cart.emptyCopy": "Discover our range of parapharmacy, skincare, and wellness essentials.",
            "cart.startShopping": "Start Shopping",
            "cart.remove": "Remove",
            "wishlist.product": "Product",
            "common.openMenu": "Open menu",
            "common.closeMenu": "Close menu",
            "common.openAccount": "Open account",
            "common.openWishlist": "Open wishlist",
            "common.shoppingCart": "Shopping Cart",
            "common.searchPlaceholder": "Search for products",
            "common.imageComingSoon": "Image coming soon",
            "nav.home": "Home",
            "account.access": "Account access",
            "account.title": "My Account",
            "account.loginHeading": "Log in",
            "account.createHeading": "Create account",
            "account.email": "Email",
            "account.password": "Password",
            "account.fullName": "Full name",
            "account.phone": "Phone number",
            "account.login": "Log in",
            "account.createAccount": "Create account",
            "account.signOut": "Sign out",
            "account.error.invalidCredential": "Wrong email or password.",
            "account.error.emailInUse": "This email already has an account.",
            "account.error.weakPassword": "Password must be at least 6 characters.",
            "account.error.generic": "Could not complete this action.",
            "account.error.phoneRequired": "Phone number is required.",
            "account.status.loggedIn": "Logged in.",
            "account.status.created": "Account created.",
            "account.status.signedOut": "Signed out.",
            "account.status.signedInAs": "Signed in as",
            "account.status.noEmail": "account without email",
            "cart.continueShopping": "Continue shopping",
            "cart.browseProducts": "Browse products",
            "cart.emptyBody": "Add products from the listing or product detail page.",
            "cart.items": "Cart items",
            "cart.summary": "Cart summary",
            "cart.summaryTitle": "Order Summary",
            "cart.itemsLabel": "Items",
            "cart.total": "Total",
            "cart.clearCart": "Clear cart",
            "cart.crossSellTitle": "Complete Your Care Routine",
            "cart.qty": "Qty",
            "cart.decreaseQuantity": "Decrease quantity",
            "cart.increaseQuantity": "Increase quantity",
            "cart.quantity": "Quantity",
            "cart.removeItem": "Remove item",
            "checkout.title": "Checkout",
            "checkout.backToCart": "Back to cart",
            "checkout.emptyBody": "Add products before checkout.",
            "checkout.authRequiredTitle": "Email account required",
            "checkout.authRequiredBody": "Log in or create an account with email and password before checkout.",
            "checkout.authRequiredCta": "Make / log in with email",
            "checkout.contact": "Contact",
            "checkout.deliveryAddress": "Delivery Address",
            "checkout.country": "Country",
            "checkout.stateProvince": "State/Province",
            "checkout.city": "City",
            "checkout.address": "Address",
            "checkout.building": "Apartment/Suite/Building",
            "checkout.floor": "Floor (الطابق)",
            "checkout.floorPlain": "Floor",
            "checkout.paymentMethod": "Payment Method",
            "checkout.cashOnDelivery": "Cash on Delivery",
            "checkout.placeOrder": "Place order",
            "checkout.orderSummary": "Order summary",
            "checkout.discountCode": "Gift / discount code",
            "checkout.codePlaceholder": "Code",
            "checkout.apply": "Apply",
            "checkout.discount": "Discount",
            "checkout.delivery": "Delivery",
            "checkout.free": "Free",
            "checkout.lebanon": "Lebanon",
            "checkout.checkingCode": "Checking code...",
            "checkout.codeInvalid": "Code not found or inactive.",
            "checkout.minimumSubtotalPrefix": "This code needs a minimum subtotal of",
            "checkout.codeApplied": "Code applied.",
            "checkout.codeCheckError": "Could not check this code right now.",
            "checkout.placingOrder": "Placing your order...",
            "checkout.placeOrderError": "Could not place the order. Please try again.",
            "wishlist.title": "Wishlist",
            "wishlist.emptyTitle": "Your wishlist is empty",
            "wishlist.emptyBody": "Save products with the heart button.",
            "wishlist.products": "Wishlist products",
            "wishlist.addToCart": "Add to cart",
            "wishlist.remove": "Remove from wishlist",
            "wishlist.added": "Added",
            "order.noOrderTitle": "No order found",
            "order.noOrderBody": "Start from the cart to place an order.",
            "order.received": "Order received",
            "order.details": "Order Details",
            "order.customer": "Customer",
            "order.payment": "Payment",
            "order.status": "Status",
            "order.products": "Products",
            "order.trackOrder": "Track order",
            "order.orderPrefix": "Order",
            "track.title": "Track Order",
            "track.heroCopy": "Enter your order number to see the latest status.",
            "track.orderNumber": "Order number",
            "track.track": "Track",
            "track.orderStatus": "Order status",
            "track.deliveryArea": "Delivery area",
            "track.shopMore": "Continue shopping",
            "track.orderCancelled": "Order cancelled",
            "track.updated": "Updated",
            "track.orderFound": "Order found.",
            "track.signInRequired": "Sign in to track your orders.",
            "track.checkingOrder": "Checking order...",
            "track.notFound": "No order found with that number. Check the order number and try again.",
            "track.loadError": "Could not load the order right now. Try again in a moment.",
            "track.step.0": "Order received",
            "track.step.1": "Confirmed",
            "track.step.2": "Preparing",
            "track.step.3": "Out for delivery",
            "track.step.4": "Delivered",
            "brand.title": "Brands",
            "brand.breadcrumb": "Brands breadcrumb",
            "brand.heroTitle": "Trusted Brands",
            "brand.heroCopy": "Explore authentic parapharmacy, skincare, wellness, and medical supplies from trusted brands.",
            "brand.featured": "Featured Brands",
            "brand.featuredCopy": "Discover popular names selected by Heliomed.",
            "brand.directory": "Brand Directory",
            "brand.directoryCopy": "Browse all available brands.",
            "brand.searchPlaceholder": "Search brands by name...",
            "brand.filterByLetter": "Filter brands by first letter",
            "brand.noResults": "No brands found matching your search."
        },
        ar: {
            "lang.english": "EN",
            "lang.arabic": "عربي",
            "aria.openMenu": "فتح القائمة",
            "aria.openSearch": "فتح البحث",
            "aria.closeSearch": "إغلاق البحث",
            "aria.language": "اللغة",
            "aria.closeMenu": "إغلاق القائمة",
            "aria.account": "الحساب",
            "aria.openAccount": "فتح الحساب",
            "aria.wishlist": "المفضلة",
            "aria.openWishlist": "فتح المفضلة",
            "aria.shoppingCart": "سلة التسوق",
            "aria.productSuggestions": "اقتراحات المنتجات",
            "aria.socialLinks": "روابط هيليومد الاجتماعية",
            "aria.facebook": "هيليومد على فيسبوك",
            "aria.linkedin": "هيليومد على لينكدإن",
            "aria.instagram": "هيليومد على إنستغرام",
            "aria.whatsapp": "تواصل مع هيليومد عبر واتساب",
            "aria.breadcrumb": "مسار التنقل",
            "aria.collectionFilters": "فلاتر المجموعة",
            "aria.sortProducts": "ترتيب المنتجات",
            "aria.collectionProducts": "منتجات المجموعة",
            "aria.zoomProduct": "تكبير صورة المنتج",
            "aria.quantitySelector": "اختيار الكمية",
            "aria.quantity": "الكمية",
            "aria.decreaseQuantity": "إنقاص الكمية",
            "aria.increaseQuantity": "زيادة الكمية",
            "aria.chooseRating": "اختيار التقييم",
            "aria.productZoom": "تكبير صورة المنتج",
            "aria.closeProductZoom": "إغلاق تكبير الصورة",
            "aria.stickyCart": "زر إضافة للسلة ثابت",
            "aria.cartPanel": "سلة التسوق",
            "aria.closeCart": "إغلاق لوحة السلة",
            "aria.toggleWishlist": "تبديل المفضلة",
            "aria.toggleSubcategories": "إظهار أو إخفاء فئات {name}",
            "nav.menu": "القائمة",
            "nav.parapharmacy": "بارافارماسي",
            "nav.medicalSupplies": "المستلزمات الطبية",
            "nav.organic": "عضوي",
            "nav.perfume": "العطور",
            "nav.makeup": "المكياج",
            "nav.offers": "العروض",
            "nav.blog": "المدونة",
            "nav.login": "تسجيل الدخول",
            "nav.wishlist": "المفضلة",
            "nav.viewAll": "عرض كل {name}",
            "nav.viewAllParapharmacy": "عرض كل البارافارماسي",
            "nav.viewAllOrganic": "عرض كل المنتجات العضوية",
            "nav.supports": "الدعامات",
            "nav.disposables": "المستهلكات",
            "nav.other": "أخرى",
            "nav.women": "نساء",
            "nav.men": "رجال",
            "nav.kids": "أطفال",
            "nav.bundles": "باقات",
            "nav.face": "الوجه",
            "nav.eye": "العين",
            "nav.lips": "الشفاه",
            "nav.nail": "الأظافر",
            "nav.toolsAccessories": "الأدوات والإكسسوارات",
            "nav.makeupRemover": "مزيل المكياج",
            "nav.medicalMakeup": "مكياج طبي",
            "nav.palettes": "باليت",
            "nav.koreanProducts": "منتجات كورية",
            "nav.skinCare": "العناية بالبشرة",
            "nav.hairCare": "العناية بالشعر",
            "nav.faceCare": "العناية بالوجه",
            "nav.dentalCare": "العناية بالأسنان",
            "nav.bodyCare": "العناية بالجسم",
            "nav.nailCare": "العناية بالأظافر",
            "nav.footCare": "العناية بالقدمين",
            "nav.babyCare": "العناية بالطفل",
            "nav.motherCare": "العناية بالأم",
            "nav.kidsCare": "العناية بالأطفال",
            "nav.menCare": "العناية بالرجال",
            "nav.geriatricCare": "رعاية كبار السن",
            "nav.nutrition": "التغذية",
            "nav.supplements": "المكملات",
            "nav.ankleSupport": "دعامة الكاحل",
            "nav.backSupport": "دعامة الظهر",
            "nav.cervicalSupport": "دعامة الرقبة",
            "nav.diskTrac": "ديسك تراك",
            "nav.kneeSupport": "دعامة الركبة",
            "nav.orthopedic": "العظام ودعامات المفاصل",
            "nav.shoulderElbow": "الكتف والمرفق",
            "nav.wristHand": "دعامات المعصم واليد",
            "nav.gloves": "قفازات",
            "nav.gauze": "شاش",
            "nav.needles": "إبر",
            "nav.sutures": "خيوط جراحية",
            "nav.blades": "شفرات",
            "nav.woundCare": "العناية بالجروح",
            "nav.drapes": "أغطية وملابس طبية",
            "nav.homeCare": "رعاية منزلية",
            "nav.liposuction": "شفط الدهون",
            "nav.pediatric": "أطفال",
            "nav.vascular": "أوعية دموية",
            "nav.pillows": "وسائد",
            "search.placeholder": "ابحث عن المنتجات...",
            "search.placeholderForProducts": "ابحث عن المنتجات",
            "search.filters": "الفلاتر",
            "search.closeFilters": "إغلاق الفلاتر",
            "search.inputPlaceholder": "بحث",
            "search.searchProducts": "البحث في المنتجات",
            "search.clearSearch": "مسح البحث",
            "search.viewResults": "عرض النتائج",
            "search.activeFilters": "الفلاتر النشطة",
            "search.searchResults": "نتائج البحث",
            "search.empty": "لا توجد منتجات مطابقة لهذا البحث.",
            "search.popularSearches": "الأكثر بحثاً",
            "search.categories": "الفئات:",
            "search.termLabel": "البحث",
            "loader.label": "تحميل متجر هيليومد",
            "loader.title": "جارٍ تحميل هيليومد",
            "loader.copy": "يتم تحميل اختيارات العناية والفئات والمنتجات المميزة...",
            "hero.kicker": "أساسيات هيليومد",
            "hero.title": "عناية موثوقة في منزلك",
            "hero.copy": "أساسيات يومية للبارافارماسي والجمال والعافية والتعافي، مرتبة لتسهيل اختيارك بسرعة.",
            "hero.shopDailyCare": "تسوق العناية اليومية",
            "footer.shop": "تسوق",
            "footer.vitamins": "الفيتامينات والمكملات",
            "footer.skincare": "العناية بالبشرة",
            "footer.medicalSupplies": "المستلزمات الطبية",
            "footer.support": "الدعم",
            "footer.trackOrder": "تتبع طلبي",
            "footer.myAccount": "حسابي",
            "footer.care": "عناية هيليومد",
            "footer.careCopy": "متجر بارافارماسي ورعاية صحية يخدم كل مناطق لبنان بمنتجات أصلية.",
            "footer.whatsapp": "واتساب مباشر",
            "footer.whatsappCta": "تواصل مع المختصين ←",
            "footer.logoSub": "رعاية بارافارماسي موثوقة",
            "footer.rights": "جميع الحقوق محفوظة © 2026 هيليومد",
            "collection.home": "الرئيسية",
            "collection.label": "المجموعة",
            "collection.copy": "تصفح منتجات هيليومد.",
            "collection.productsFound": "منتج موجود",
            "collection.brand": "العلامة التجارية",
            "collection.category": "الفئة",
            "collection.section": "القسم",
            "collection.offer": "العرض",
            "collection.price": "السعر",
            "collection.min": "الحد الأدنى",
            "collection.max": "الحد الأقصى",
            "collection.clearFilters": "مسح الفلاتر",
            "collection.sort": "ترتيب",
            "collection.sortAz": "من أ إلى ي",
            "collection.sortZa": "من ي إلى أ",
            "collection.sortPriceAsc": "السعر: من الأقل إلى الأعلى",
            "collection.sortPriceDesc": "السعر: من الأعلى إلى الأقل",
            "collection.loading": "جارٍ تحميل المنتجات...",
            "collection.loadMore": "تحميل المزيد",
            "collection.empty": "لا توجد منتجات مطابقة لهذه المجموعة.",
            "collection.related": "مجموعات ذات صلة",
            "collection.couldNotLoad": "تعذر تحميل المنتجات.",
            "collection.productCount": "{count} منتج",
            "collection.productCount_plural": "{count} منتجات",
            "product.products": "المنتجات",
            "product.detail": "تفاصيل المنتج",
            "product.notFound": "لم يتم العثور على المنتج. ارجع إلى المنتجات واختر منتجاً آخر.",
            "product.noReviewsYet": "لا توجد مراجعات بعد",
            "product.size": "المقاس",
            "product.option": "الخيار",
            "product.sizeGuide": "دليل المقاسات",
            "product.addToCart": "أضف إلى السلة",
            "product.buyNow": "اشتر الآن",
            "product.cashDelivery": "الدفع عند الاستلام متاح",
            "product.whish": "الدفع عبر Whish متاح عند إتمام الطلب",
            "product.details": "التفاصيل",
            "product.usage": "طريقة الاستخدام",
            "product.warnings": "التحذيرات",
            "product.reviews": "المراجعات",
            "product.writeReview": "اكتب مراجعة",
            "product.reviewEligibilityDefault": "سجّل الدخول للتحقق إذا كان هذا المنتج جاهزاً للمراجعة.",
            "product.yourName": "اسمك",
            "product.yourReview": "مراجعتك",
            "product.submitReview": "إرسال المراجعة",
            "product.updateReview": "تحديث المراجعة",
            "product.youMayLike": "قد يعجبك أيضاً",
            "product.viewProducts": "عرض المنتجات",
            "product.moreFromBrand": "المزيد من هذه العلامة",
            "product.moreFrom": "المزيد من {brand}",
            "product.viewBrand": "عرض العلامة",
            "product.stickyProduct": "منتج",
            "product.add": "إضافة",
            "product.now": "الآن: {price}",
            "product.msrp": "السعر الأساسي: {price}",
            "product.saveToday": "وفّر {discount}% اليوم",
            "product.everydayPricing": "سعر عناية يومي",
            "product.imageComingSoon": "الصورة قريباً",
            "product.inStock": "متوفر",
            "product.outOfStock": "غير متوفر",
            "product.review": "{count} مراجعة",
            "product.review_plural": "{count} مراجعات",
            "product.basedOnReviews": "استناداً إلى {count} مراجعة من العملاء.",
            "product.basedOnReviews_plural": "استناداً إلى {count} مراجعات من العملاء.",
            "product.verifiedPurchase": "شراء موثّق",
            "product.firstReview": "كن أول من يراجع هذا المنتج.",
            "product.signInToReview": "سجّل الدخول لمراجعة المنتجات التي اشتريتها بعد وضع علامة تم التسليم / مدفوع على الطلب.",
            "product.checkingOrders": "جارٍ التحقق من طلباتك المسلّمة...",
            "product.purchaseFirst": "يمكنك مراجعة هذا المنتج بعد شرائه وبعد وضع علامة تم التسليم / مدفوع على الطلب.",
            "product.verifiedCanUpdate": "شراء موثّق. يمكنك تحديث مراجعتك.",
            "product.verifiedCanReview": "شراء موثّق. طلبك المسلّم يسمح لك بمراجعة هذا المنتج.",
            "product.couldNotCheckOrders": "تعذر التحقق من طلباتك المسلّمة الآن. يرجى المحاولة لاحقاً.",
            "product.couldNotLoadProduct": "تعذر تحميل هذا المنتج الآن.",
            "product.addedToCart": "تمت إضافة {title} إلى السلة.",
            "product.reviewDeliveredOnly": "يمكن مراجعة المشتريات المسلّمة فقط.",
            "product.reviewUpdated": "تم تحديث المراجعة.",
            "product.reviewSubmitted": "تم إرسال المراجعة.",
            "product.reviewSaveError": "تعذر حفظ مراجعتك.",
            "product.stars": "{count} نجوم",
            "product.defaultDescription": "{title} من {brand}، مختار لروتين عناية هيليومد.",
            "product.defaultUsage": "استخدمه حسب التعليمات على عبوة المنتج أو وفق توصية أخصائي الرعاية الصحية.",
            "product.defaultWarnings": "اقرأ الملصق قبل الاستخدام. يُحفظ بعيداً عن متناول الأطفال. اسأل أخصائي رعاية صحية إذا لم تكن متأكداً من ملاءمة هذا المنتج لك.",
            "product.sizeGuideSupport": "قِس المنطقة براحة، ثم اختر المقاس المطابق لعبوة المنتج. إذا كنت بين مقاسين، اختر الدعامة الأكبر للراحة.",
            "product.sizeGuideSkincare": "يشير الحجم إلى سعة العبوة. اختر الأحجام الأصغر للتجربة أو السفر، والأكبر للروتين اليومي.",
            "product.sizeGuideSupplement": "يشير الحجم إلى عدد الكبسولات أو الأقراص أو الحصص. تحقق من طريقة الاستخدام قبل اختيار العبوة.",
            "product.sizeGuideDefault": "اختر الخيار المطابق لعبوة المنتج. تأكد من التعليمات وتفاصيل الحجم على الملصق قبل الاستخدام.",
            "card.details": "التفاصيل",
            "card.add": "إضافة",
            "card.added": "تمت الإضافة",
            "card.noProductsBrand": "لا توجد منتجات متاحة لهذه العلامة.",
            "card.noProductsCollection": "لم يتم العثور على منتجات في هذه المجموعة.",
            "card.shopCollection": "تسوق المجموعة",
            "card.shopNow": "تسوق الآن",
            "card.showAllIn": "عرض كل منتجات {name}",
            "card.addedToCart": "تمت إضافة {title} إلى السلة.",
            "card.addedToWishlist": "تمت إضافة {title} إلى المفضلة.",
            "card.removedFromWishlist": "تمت إزالة {title} من المفضلة.",
            "cart.title": "سلتك",
            "cart.subtotal": "المجموع الفرعي",
            "cart.note": "تُحسب الضرائب والتوصيل عند إتمام الطلب.",
            "cart.goToCart": "الذهاب إلى السلة",
            "cart.checkout": "إتمام الطلب",
            "cart.freeOver": "توصيل مجاني للطلبات فوق",
            "cart.freeUnlocked": "لقد حصلت على",
            "cart.freeDelivery": "توصيل مجاني",
            "cart.addMore": "أضف",
            "cart.moreForFree": "إضافية للحصول على",
            "cart.freeOverAmount": "توصيل مجاني للطلبات التي تتجاوز {amount}",
            "cart.freeUnlockedFull": "لقد حصلت على توصيل مجاني!",
            "cart.addMoreFull": "أضف {amount} للحصول على توصيل مجاني!",
            "cart.emptyTitle": "سلتك فارغة",
            "cart.emptyCopy": "اكتشف مجموعتنا من أساسيات البارافارماسي والعناية بالبشرة والعافية.",
            "cart.startShopping": "ابدأ التسوق",
            "cart.remove": "إزالة",
            "wishlist.product": "منتج",
            "common.openMenu": "فتح القائمة",
            "common.closeMenu": "إغلاق القائمة",
            "common.openAccount": "فتح الحساب",
            "common.openWishlist": "فتح المفضلة",
            "common.shoppingCart": "سلة التسوق",
            "common.searchPlaceholder": "ابحث عن المنتجات",
            "common.imageComingSoon": "الصورة قريباً",
            "nav.home": "الرئيسية",
            "account.access": "الدخول إلى الحساب",
            "account.title": "حسابي",
            "account.loginHeading": "تسجيل الدخول",
            "account.createHeading": "إنشاء حساب",
            "account.email": "البريد الإلكتروني",
            "account.password": "كلمة المرور",
            "account.fullName": "الاسم الكامل",
            "account.phone": "رقم الهاتف",
            "account.login": "تسجيل الدخول",
            "account.createAccount": "إنشاء حساب",
            "account.signOut": "تسجيل الخروج",
            "account.error.invalidCredential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
            "account.error.emailInUse": "يوجد حساب مرتبط بهذا البريد الإلكتروني.",
            "account.error.weakPassword": "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
            "account.error.generic": "تعذر إكمال هذا الإجراء.",
            "account.error.phoneRequired": "رقم الهاتف مطلوب.",
            "account.status.loggedIn": "تم تسجيل الدخول.",
            "account.status.created": "تم إنشاء الحساب.",
            "account.status.signedOut": "تم تسجيل الخروج.",
            "account.status.signedInAs": "تم تسجيل الدخول باسم",
            "account.status.noEmail": "حساب من دون بريد إلكتروني",
            "cart.continueShopping": "متابعة التسوق",
            "cart.browseProducts": "تصفح المنتجات",
            "cart.emptyBody": "أضف منتجات من صفحة القائمة أو تفاصيل المنتج.",
            "cart.items": "عناصر السلة",
            "cart.summary": "ملخص السلة",
            "cart.summaryTitle": "ملخص الطلب",
            "cart.itemsLabel": "المنتجات",
            "cart.total": "الإجمالي",
            "cart.clearCart": "إفراغ السلة",
            "cart.crossSellTitle": "أكمل روتين العناية",
            "cart.qty": "الكمية",
            "cart.decreaseQuantity": "إنقاص الكمية",
            "cart.increaseQuantity": "زيادة الكمية",
            "cart.quantity": "الكمية",
            "cart.removeItem": "إزالة المنتج",
            "checkout.title": "إتمام الطلب",
            "checkout.backToCart": "العودة إلى السلة",
            "checkout.emptyBody": "أضف منتجات قبل إتمام الطلب.",
            "checkout.authRequiredTitle": "يلزم حساب ببريد إلكتروني",
            "checkout.authRequiredBody": "سجّل الدخول أو أنشئ حساباً بالبريد الإلكتروني وكلمة المرور قبل إتمام الطلب.",
            "checkout.authRequiredCta": "إنشاء حساب أو تسجيل الدخول",
            "checkout.contact": "معلومات التواصل",
            "checkout.deliveryAddress": "عنوان التوصيل",
            "checkout.country": "البلد",
            "checkout.stateProvince": "المحافظة",
            "checkout.city": "المدينة",
            "checkout.address": "العنوان",
            "checkout.building": "الشقة / الجناح / المبنى",
            "checkout.floor": "الطابق",
            "checkout.floorPlain": "الطابق",
            "checkout.paymentMethod": "طريقة الدفع",
            "checkout.cashOnDelivery": "الدفع عند الاستلام",
            "checkout.placeOrder": "تأكيد الطلب",
            "checkout.orderSummary": "ملخص الطلب",
            "checkout.discountCode": "قسيمة أو رمز خصم",
            "checkout.codePlaceholder": "الرمز",
            "checkout.apply": "تطبيق",
            "checkout.discount": "الخصم",
            "checkout.delivery": "التوصيل",
            "checkout.free": "مجاني",
            "checkout.lebanon": "لبنان",
            "checkout.checkingCode": "جارٍ التحقق من الرمز...",
            "checkout.codeInvalid": "الرمز غير موجود أو غير فعّال.",
            "checkout.minimumSubtotalPrefix": "يتطلب هذا الرمز حداً أدنى للمجموع الفرعي قدره",
            "checkout.codeApplied": "تم تطبيق الرمز.",
            "checkout.codeCheckError": "تعذر التحقق من الرمز الآن.",
            "checkout.placingOrder": "جارٍ إرسال طلبك...",
            "checkout.placeOrderError": "تعذر إرسال الطلب. يرجى المحاولة مجدداً.",
            "wishlist.title": "المفضلة",
            "wishlist.emptyTitle": "قائمة المفضلة فارغة",
            "wishlist.emptyBody": "احفظ المنتجات باستخدام زر القلب.",
            "wishlist.products": "منتجات المفضلة",
            "wishlist.addToCart": "أضف إلى السلة",
            "wishlist.remove": "إزالة من المفضلة",
            "wishlist.added": "تمت الإضافة",
            "order.noOrderTitle": "لم يتم العثور على طلب",
            "order.noOrderBody": "ابدأ من السلة لإتمام طلب.",
            "order.received": "تم استلام الطلب",
            "order.details": "تفاصيل الطلب",
            "order.customer": "العميل",
            "order.payment": "الدفع",
            "order.status": "الحالة",
            "order.products": "المنتجات",
            "order.trackOrder": "تتبع الطلب",
            "order.orderPrefix": "الطلب",
            "track.title": "تتبع الطلب",
            "track.heroCopy": "أدخل رقم طلبك للاطلاع على أحدث حالة.",
            "track.orderNumber": "رقم الطلب",
            "track.track": "تتبع",
            "track.orderStatus": "حالة الطلب",
            "track.deliveryArea": "منطقة التوصيل",
            "track.shopMore": "متابعة التسوق",
            "track.orderCancelled": "تم إلغاء الطلب",
            "track.updated": "آخر تحديث",
            "track.orderFound": "تم العثور على الطلب.",
            "track.signInRequired": "سجّل الدخول لتتبع طلباتك.",
            "track.checkingOrder": "جارٍ التحقق من الطلب...",
            "track.notFound": "لم يتم العثور على طلب بهذا الرقم. تحقق من الرقم وحاول مجدداً.",
            "track.loadError": "تعذر تحميل الطلب الآن. حاول بعد قليل.",
            "track.step.0": "تم استلام الطلب",
            "track.step.1": "تم التأكيد",
            "track.step.2": "قيد التجهيز",
            "track.step.3": "خرج للتوصيل",
            "track.step.4": "تم التوصيل",
            "brand.title": "العلامات التجارية",
            "brand.breadcrumb": "مسار العلامات التجارية",
            "brand.heroTitle": "علامات تجارية موثوقة",
            "brand.heroCopy": "استكشف منتجات البارافارماسي والعناية بالبشرة والعافية والمستلزمات الطبية الأصلية من علامات موثوقة.",
            "brand.featured": "علامات تجارية مميزة",
            "brand.featuredCopy": "اكتشف الأسماء الشائعة التي اختارتها هيليومد.",
            "brand.directory": "دليل العلامات التجارية",
            "brand.directoryCopy": "تصفح جميع العلامات التجارية المتوفرة.",
            "brand.searchPlaceholder": "ابحث باسم العلامة التجارية...",
            "brand.filterByLetter": "تصفية العلامات حسب الحرف الأول",
            "brand.noResults": "لا توجد علامات تجارية مطابقة لبحثك."
        }
    };

    var textAliases = {
        "MENU": "nav.menu",
        "PARAPHARMACY": "nav.parapharmacy",
        "MEDICAL SUPPLIES": "nav.medicalSupplies",
        "ORGANIC": "nav.organic",
        "PERFUME": "nav.perfume",
        "MAKEUP": "nav.makeup",
        "OFFERS": "nav.offers",
        "BLOG": "nav.blog",
        "LOGIN": "nav.login",
        "WISHLIST": "nav.wishlist",
        "Search for products": "search.placeholderForProducts",
        "Search products...": "search.placeholder",
        "Heliomed Essentials": "hero.kicker",
        "Care You Can Trust at Home": "hero.title",
        "Daily Paraparapharmacy, beauty, wellness, and recovery essentials organized for fast decisions.": "hero.copy",
        "Shop Daily Care": "hero.shopDailyCare",
        "Shop": "footer.shop",
        "Vitamins & Supplements": "footer.vitamins",
        "Skincare": "footer.skincare",
        "Medical Supplies": "footer.medicalSupplies",
        "Support": "footer.support",
        "Track My Order": "footer.trackOrder",
        "My Account": "footer.myAccount",
        "Heliomed Care": "footer.care",
        "Paraparapharmacy & healthcare store serving all regions of Lebanon with authentic products.": "footer.careCopy",
        "Direct WhatsApp": "footer.whatsapp",
        "Connect with our specialists →": "footer.whatsappCta",
        "trusted Paraparapharmacy care": "footer.logoSub",
        "All Rights Reserved © 2026 Heliomed": "footer.rights",
        "Your Cart": "cart.title",
        "Subtotal": "cart.subtotal",
        "Taxes and shipping calculated at checkout.": "cart.note",
        "Go to cart": "cart.goToCart",
        "Proceed to checkout": "cart.checkout",
        "Your cart is empty": "cart.emptyTitle",
        "Discover our range of parapharmacy, skincare, and wellness essentials.": "cart.emptyCopy",
        "Start Shopping": "cart.startShopping",
        "Remove": "cart.remove",
        "Add to cart": "product.addToCart",
        "Add to Cart": "product.addToCart",
        "Buy now": "product.buyNow",
        "Out of stock": "product.outOfStock",
        "Details": "product.details",
        "Usage": "product.usage",
        "Warnings": "product.warnings",
        "Reviews": "product.reviews",
        "Write a review": "product.writeReview",
        "Products": "product.products",
        "Home": "collection.home",
        "Collection": "collection.label",
        "Brand": "collection.brand",
        "Category": "collection.category",
        "Section": "collection.section",
        "Offer": "collection.offer",
        "Price": "collection.price",
        "Min": "collection.min",
        "Max": "collection.max",
        "Clear filters": "collection.clearFilters",
        "Sort": "collection.sort",
        "Loading products...": "collection.loading",
        "Load more": "collection.loadMore"
        ,"No products matched this collection.": "collection.empty"
        ,"Related Collections": "collection.related"
        ,"No reviews yet.": "product.noReviewsYet"
        ,"Size": "product.size"
        ,"Size guide": "product.sizeGuide"
        ,"Cash on Delivery available": "product.cashDelivery"
        ,"Whish payment available at checkout": "product.whish"
        ,"You May Also Like": "product.youMayLike"
        ,"View products": "product.viewProducts"
        ,"More From This Brand": "product.moreFromBrand"
        ,"View brand": "product.viewBrand"
        ,"Product": "product.stickyProduct"
        ,"Add": "product.add"
        ,"Ankle Support": "nav.ankleSupport"
        ,"Back Support": "nav.backSupport"
        ,"Cervical Support": "nav.cervicalSupport"
        ,"Disk Trac": "nav.diskTrac"
        ,"Knee Support": "nav.kneeSupport"
        ,"Orthopedic": "nav.orthopedic"
        ,"Shoulder & Elbow": "nav.shoulderElbow"
        ,"Shoulder and Elbow": "nav.shoulderElbow"
        ,"Wrist & Hand Braces": "nav.wristHand"
        ,"Wrist and Hand Braces": "nav.wristHand"
        ,"Gloves": "nav.gloves"
        ,"Gauze": "nav.gauze"
        ,"Guaze": "nav.gauze"
        ,"Needles": "nav.needles"
        ,"Sutures": "nav.sutures"
        ,"Suture": "nav.sutures"
        ,"Blades": "nav.blades"
        ,"Wound Care": "nav.woundCare"
        ,"Drapes": "nav.drapes"
        ,"Drapes / Apparel": "nav.drapes"
        ,"Home Care": "nav.homeCare"
        ,"Liposuction": "nav.liposuction"
        ,"Pediatric": "nav.pediatric"
        ,"Vascular": "nav.vascular"
        ,"Pillows": "nav.pillows"
        ,"Skin Care": "nav.skinCare"
        ,"Hair Care": "nav.hairCare"
        ,"Face Care": "nav.faceCare"
        ,"Dental Care": "nav.dentalCare"
        ,"Body Care": "nav.bodyCare"
        ,"Nail Care": "nav.nailCare"
        ,"Foot Care": "nav.footCare"
        ,"Baby Care": "nav.babyCare"
        ,"Mother Care": "nav.motherCare"
        ,"Kids Care": "nav.kidsCare"
        ,"Men Care": "nav.menCare"
        ,"Geriatric Care": "nav.geriatricCare"
        ,"Nutrition": "nav.nutrition"
        ,"Supplements": "nav.supplements"
        ,"Palettes": "nav.palettes"
        ,"Korean Products": "nav.koreanProducts"
    };

    var attrAliases = {
        "Open menu": "aria.openMenu",
        "Close menu": "aria.closeMenu",
        "Open search": "aria.openSearch",
        "Close search": "aria.closeSearch",
        "Account": "aria.account",
        "Open account": "aria.openAccount",
        "Wishlist": "aria.wishlist",
        "Open wishlist": "aria.openWishlist",
        "Shopping Cart": "aria.shoppingCart",
        "Product suggestions": "aria.productSuggestions",
        "Contact Heliomed on WhatsApp": "aria.whatsapp",
        "Close cart panel": "aria.closeCart",
        "Decrease quantity": "aria.decreaseQuantity",
        "Increase quantity": "aria.increaseQuantity",
        "Quantity": "aria.quantity",
        "Product filters": "search.filters",
        "Close filters": "search.closeFilters",
        "Search products": "search.searchProducts",
        "Clear search": "search.clearSearch",
        "Active filters": "search.activeFilters",
        "Sort products": "aria.sortProducts",
        "Search results": "search.searchResults",
        "Zoom product image": "aria.zoomProduct",
        "Quantity selector": "aria.quantitySelector",
        "Choose rating": "aria.chooseRating",
        "Product image zoom": "aria.productZoom",
        "Close image zoom": "aria.closeProductZoom",
        "Sticky add to cart": "aria.stickyCart",
        "Toggle wishlist": "aria.toggleWishlist"
    };

    var textNodeKeys = new WeakMap();

    function normalizeLang(lang) {
        return SUPPORTED[lang] ? lang : FALLBACK_LANG;
    }

    function getLang() {
        try {
            return normalizeLang(localStorage.getItem(STORAGE_KEY) || FALLBACK_LANG);
        } catch (error) {
            return FALLBACK_LANG;
        }
    }

    function interpolate(text, params) {
        return String(text).replace(/\{([^}]+)\}/g, function (_, key) {
            return params && params[key] != null ? String(params[key]) : "";
        });
    }

    function t(key, params) {
        var lang = getLang();
        var dict = messages[lang] || messages[FALLBACK_LANG];
        var fallback = messages[FALLBACK_LANG] || {};
        var resolvedKey = textAliases[key] || key;
        var fallbackText = typeof params === "string" ? params : (fallback[resolvedKey] || key);
        var interpolationParams = typeof params === "string" ? null : params;
        return interpolate(dict[resolvedKey] || fallback[resolvedKey] || fallbackText, interpolationParams);
    }

    function tp(key, count, params) {
        var pluralKey = Number(count) === 1 ? key : key + "_plural";
        return t(pluralKey, Object.assign({ count: count }, params || {}));
    }

    function applyDocumentDirection(lang) {
        var next = normalizeLang(lang);
        document.documentElement.setAttribute("lang", next);
        document.documentElement.setAttribute("dir", next === "ar" ? "rtl" : "ltr");
    }

    function translate(root) {
        var scope = root || document;
        if (scope.nodeType === 1 && scope.matches("[data-i18n]")) {
            scope.textContent = t(scope.dataset.i18n);
        }
        scope.querySelectorAll("[data-i18n]").forEach(function (node) {
            node.textContent = t(node.dataset.i18n);
        });
        if (scope.nodeType === 1 && scope.matches("[data-i18n-placeholder]")) {
            scope.setAttribute("placeholder", t(scope.dataset.i18nPlaceholder));
        }
        scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
            node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
        });
        if (scope.nodeType === 1 && scope.matches("[data-i18n-aria-label]")) {
            scope.setAttribute("aria-label", t(scope.dataset.i18nAriaLabel));
        }
        scope.querySelectorAll("[data-i18n-aria-label]").forEach(function (node) {
            node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
        });
        if (scope.nodeType === 1 && scope.matches("[data-i18n-aria]")) {
            scope.setAttribute("aria-label", t(scope.dataset.i18nAria));
        }
        scope.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
            node.setAttribute("aria-label", t(node.dataset.i18nAria));
        });
        if (scope.nodeType === 1 && scope.matches("[placeholder]")) {
            var placeholderKey = attrAliases[scope.getAttribute("placeholder")];
            if (placeholderKey) scope.setAttribute("placeholder", t(placeholderKey));
        }
        scope.querySelectorAll("[placeholder]").forEach(function (node) {
            var placeholderKey = attrAliases[node.getAttribute("placeholder")];
            if (placeholderKey) node.setAttribute("placeholder", t(placeholderKey));
        });
        if (scope.nodeType === 1 && scope.matches("[aria-label]")) {
            var ariaKey = attrAliases[scope.getAttribute("aria-label")];
            if (ariaKey) scope.setAttribute("aria-label", t(ariaKey));
        }
        scope.querySelectorAll("[aria-label]").forEach(function (node) {
            var ariaKey = attrAliases[node.getAttribute("aria-label")];
            if (ariaKey) node.setAttribute("aria-label", t(ariaKey));
        });
        scope.querySelectorAll("[data-i18n-title]").forEach(function (node) {
            node.setAttribute("title", t(node.dataset.i18nTitle));
        });
        scope.querySelectorAll("[data-i18n-value]").forEach(function (node) {
            node.setAttribute("value", t(node.dataset.i18nValue));
        });
        document.querySelectorAll("[data-lang-option]").forEach(function (button) {
            button.classList.toggle("is-active", button.dataset.langOption === getLang());
            button.setAttribute("aria-pressed", button.dataset.langOption === getLang() ? "true" : "false");
        });
        if (scope.nodeType === 1 && scope.matches("[data-i18n-static-text]")) {
            translateExactText(scope);
        }
        scope.querySelectorAll("[data-i18n-static-text]").forEach(function (node) {
            translateExactText(node);
        });
    }

    function translateExactText(scope) {
        var target = scope || document;
        var walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                if (node.parentElement && node.parentElement.closest("script,style,noscript,textarea,input,select")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (node) {
            var key = textNodeKeys.get(node);
            var current = node.nodeValue.trim();
            if (!key) {
                key = textAliases[current];
                if (key) textNodeKeys.set(node, key);
            }
            if (!key) return;
            var nextValue = node.nodeValue.replace(current, t(key));
            if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
        });
    }

    function setLang(lang) {
        var next = normalizeLang(lang);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (error) {}
        applyDocumentDirection(next);
        translate(document);
        window.dispatchEvent(new CustomEvent("heliomed:language-change", { detail: { lang: next } }));
    }

    // Resolve bilingual CMS/category content only. Product records intentionally
    // continue to render from their existing fields and never call this helper.
    function contentValue(record, key, fallback) {
        var source = record && typeof record === "object" ? record : {};
        var englishValue = source[key];
        if (getLang() === "ar") {
            var arabicValue = source[key + "_ar"];
            if (Array.isArray(arabicValue) && arabicValue.length) return arabicValue;
            if (typeof arabicValue === "string" && arabicValue.trim()) return arabicValue;
            if (arabicValue !== undefined && arabicValue !== null && typeof arabicValue !== "string") return arabicValue;
        }
        if (Array.isArray(englishValue) && englishValue.length) return englishValue;
        if (typeof englishValue === "string" && englishValue.trim()) return englishValue;
        if (englishValue !== undefined && englishValue !== null && typeof englishValue !== "string") return englishValue;
        return fallback;
    }

    window.HeliomedI18n = {
        currentLang: getLang,
        setLang: setLang,
        t: t,
        tp: tp,
        translate: translate,
        contentValue: contentValue
    };

    applyDocumentDirection(getLang());

    document.addEventListener("click", function (event) {
        var button = event.target.closest("[data-lang-option]");
        if (!button) return;
        event.preventDefault();
        setLang(button.dataset.langOption);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            translate(document);
        });
    } else {
        translate(document);
    }

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) translate(node);
            });
        });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
