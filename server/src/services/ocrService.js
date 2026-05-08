/**
 * ocrService.js
 * Uses Tesseract.js to extract text from a receipt image,
 * then parses that text into structured grocery line items.
 */
import { createWorker } from "tesseract.js";
import sharp from "sharp";

/**
 * Pre-process the image buffer for better OCR accuracy:
 *  - Convert to grayscale
 *  - Increase contrast
 *  - Resize to at least 1200px wide (Tesseract loves high-res)
 */
async function preprocessImage(buffer) {
	console.log("[ocr] Pre-processing image with sharp...");
	return sharp(buffer)
		.grayscale()
		.normalise() // auto contrast
		.resize({ width: 1400, withoutEnlargement: false })
		.toBuffer();
}

/**
 * Very simple receipt line-item parser.
 * Indian receipts typically look like:
 *   Tomatoes         1 kg      60.00
 *   Amul Milk 1L     2 pcs    136.00
 *
 * This regex tries to capture:  NAME  QTY  UNIT  PRICE
 * We also handle lines that only have NAME + PRICE.
 */
function parseReceiptText(rawText) {
	// Clean leading/trailing noise but keep parentheses for unit detection
	const lines = rawText
		.split("\n")
		.map((l) => l.replace(/^[|\s]+|[|\s]+$/g, "").trim())
		.filter(Boolean);
	const items = [];

	for (const line of lines) {
		console.log("[ocr] Processing line:", line);
		// Skip obvious header / footer junk
		if (
			/^(total|subtotal|tax|gst|cgst|sgst|discount|savings|amount|date|bill|invoice|shop|store|thank)/i.test(
				line,
			)
		) {
			console.log("[ocr]   -> Skipped as header/footer");
			continue;
		}

		// Pattern 1: [SrNo] Name (Unit) Qty Price Amount
		// e.g. "1 Aashirvaad Atta (5kg) 1 265.00 265.00"
		const receiptRow = line.match(
			/^(\d+)?\s*(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/,
		);
		if (receiptRow) {
			const [, srNo, name, qty, price, total] = receiptRow;
			console.log(
				"[ocr]   -> Pattern 1 match! SrNo:",
				srNo,
				"Name:",
				name,
				"Qty:",
				qty,
				"Price:",
				price,
				"Total:",
				total,
			);
			const quantity = parseFloat(qty);
			const pricePerUnit = parseFloat(price);

			// Basic validation: qty * price should roughly equal total
			const calcTotal = quantity * pricePerUnit;
			const actualTotal = parseFloat(total);
			if (Math.abs(calcTotal - actualTotal) < 1) {
				items.push({
					name: cleanName(name),
					quantity,
					unit: extractUnit(name),
					pricePerUnit,
					category: guessCategory(name),
				});
				console.log("[ocr]   -> Item added successfully");
				continue;
			} else {
				console.log(
					"[ocr]   -> Validation failed: calcTotal",
					calcTotal,
					"vs actualTotal",
					actualTotal,
				);
			}
		} else {
			console.log("[ocr]   -> Pattern 1 NO match");
		}

		// Pattern 2: name  price  (quantity assumed 1, unit pcs)
		const simple = line.match(/^(.{3,40})\s+(\d{1,4}(?:\.\d{2})?)$/);
		if (simple) {
			const [, name, price] = simple;
			// Skip if name looks like a number or single word of noise
			if (/^\d/.test(name.trim())) continue;
			items.push({
				name: cleanName(name),
				quantity: 1,
				unit: "pcs",
				pricePerUnit: parseFloat(price),
				category: guessCategory(name),
			});
		}

		// Pattern 3: Fallback - Name followed by anything and ending in a number (Price)
		// This is very loose to catch anything that might be a price.
		const fallback = line.match(/^(.+?)\s+.*?(\d+(?:\.\d{2})?)$/);
		if (fallback) {
			const [, name, price] = fallback;
			if (name.trim().length >= 2 && !/^\d/.test(name.trim())) {
				items.push({
					name: cleanName(name),
					quantity: 1,
					unit: "pcs",
					pricePerUnit: parseFloat(price),
					category: guessCategory(name),
				});
			}
		}
	}

	return items;
}

function cleanName(raw) {
	return raw
		.replace(/[^a-zA-Z0-9\s\-&.]/g, "")
		.trim()
		.slice(0, 80);
}

function normaliseUnit(u) {
	const map = {
		l: "L",
		ltr: "L",
		litre: "L",
		liter: "L",
		ml: "ml",
		kg: "kg",
		kilo: "kg",
		g: "g",
		grams: "g",
		pcs: "pcs",
		pack: "pack",
		dozen: "dozen",
	};
	return map[u.toLowerCase()] ?? "pcs";
}

function extractUnit(name) {
	const m = name.match(/\((\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs|pack)\)/i);
	if (m) return normaliseUnit(m[2]);
	return "pcs";
}

function guessCategory(name) {
	const n = name
		.toLowerCase()
		// Strip brand noise for matching
		.replace(
			/aashirvaad|india gate|fortune|tata|amul|britannia|dhara|sundrop|saffola|patanjali|parle|dabur|nestlé|nestle|mdh|everest|catch|maggi|knorr|haldirams|lays|kurkure|real|tropicana|kissan|kissan|mtr|gits|mother dairy|heritage|nandini/gi,
			"",
		)
		.trim();

	if (
		/(milk|curd|dahi|paneer|cheese|butter|ghee|cream|lassi|yogurt|khoya|mawa|kadai|mozzarella|condensed)/.test(
			n,
		)
	)
		return "dairy";
	if (
		/(oil|refined|sunflower|mustard|groundnut|coconut oil|olive|til oil|sesame)/.test(
			n,
		)
	)
		return "oils";
	if (
		/(tomato|potato|onion|carrot|cabbage|spinach|capsicum|cucumber|bean|pea|brinjal|gourd|pumpkin|banana|apple|mango|orange|grape|lemon|lime|fruit|veggie|vegetable|sabzi|garlic|ginger|beetroot|okra|ladyfinger|bhindi|methi|fenugreek|coriander leaves|mint|curry leaves|drumstick|moringa|yam|arbi|sweet potato)/.test(
			n,
		)
	)
		return "produce";
	if (
		/(atta|flour|wheat|rice|basmati|oats|suji|maida|poha|semolina|roti|naan|pav|bread|cornflour|besan|gram flour|millet|bajra|jowar|ragi|quinoa|barley|vermicelli|pasta|noodle|sabudana|sago)/.test(
			n,
		)
	)
		return "grains";
	if (
		/(dal|lentil|chana|rajma|tofu|chicken|mutton|fish|egg|meat|prawn|lamb|beef|soya|soy|moong|masoor|urad|toor|arhar|kabuli|chole|peanut|almond|cashew|walnut|pistachio|dry fruit|badam)/.test(
			n,
		)
	)
		return "protein";
	if (
		/(salt|pepper|turmeric|masala|haldi|cumin|coriander|chilli|garam|spice|ajwain|jeera|hing|asafoetida|clove|cardamom|cinnamon|bay leaf|star anise|mustard seed|fenugreek seed|fennel|saunf|methi seed|kali mirch|lal mirch|dhaniya|kasuri|amchur|chaat|sambhar masala|rasam|biryani masala|kitchen king|pav bhaji masala|chhole masala)/.test(
			n,
		)
	)
		return "spices";
	if (
		/(biscuit|cookie|chips|snack|namkeen|popcorn|chocolate|candy|wafer|kurkure|lays|bhujia|mixture|chakli|murukku|mathri|diet khakhra|protein bar|granola bar)/.test(
			n,
		)
	)
		return "snacks";
	if (
		/(juice|water|soda|cola|coffee|tea|drink|beverage|lassi bottle|nimbooz|frooti|maaza|sprite|pepsi|coke|thums up|energy drink|green tea|herbal tea|chai|cocoa|horlicks|bournvita|boost|complan|glucose|squash|sharbat)/.test(
			n,
		)
	)
		return "beverages";
	if (
		/(bread|cake|puff|pastry|muffin|bakery|croissant|rusk|toast|khari|bun|donut|doughnut)/.test(
			n,
		)
	)
		return "bakery";
	return "other";
}

/**
 * Main export — drop-in replacement for geminiService.extractItemsFromReceipt
 */
export async function extractItemsFromReceipt({ buffer }) {
	const processed = await preprocessImage(buffer);

	console.log("[ocr] Initializing Tesseract worker...");
	const worker = await createWorker("eng", 1, {
		logger: (m) =>
			console.log("[tesseract]", m.status, Math.round(m.progress * 100) + "%"),
	});

	let rawText = "";
	try {
		console.log("[ocr] Recognizing text...");
		const { data } = await worker.recognize(processed);
		rawText = data.text;
		console.log("[ocr] Recognition complete. Raw text length:", rawText.length);
		console.log("--- RAW OCR TEXT START ---");
		console.log(rawText);
		console.log("--- RAW OCR TEXT END ---");
	} finally {
		await worker.terminate();
	}

	const items = parseReceiptText(rawText);
	return items;
}
