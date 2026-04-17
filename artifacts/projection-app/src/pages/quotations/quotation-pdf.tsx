import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { diffLines, diffSummary } from "./terms-diff";

type LineItem = {
  id: number;
  sortOrder: number;
  description: string;
  quantity: number;
  unit: string;
  priceMonthly: number;
  totalMonths: number;
  isExcluded?: boolean;
};

type QuotationPdfProps = {
  quotationNumber: string;
  companyName: string;
  clientName: string;
  date: string;
  status: string;
  lineItems: LineItem[];
  vatRate: number;
  logoUrl?: string | null;
  termsText?: string | null;
  defaultTermsText?: string | null;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottom: "1pt solid #111",
  },
  brand: { flexDirection: "column", maxWidth: 280 },
  companyName: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  logoBox: {
    width: 80,
    height: 32,
    border: "1pt dashed #999",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoBoxText: { fontSize: 7, color: "#999" },
  logoImage: { width: 100, height: 40, objectFit: "contain", marginBottom: 6 },
  meta: { flexDirection: "column", alignItems: "flex-end" },
  metaTitle: { fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#222" },
  metaRow: { flexDirection: "row", marginTop: 4 },
  metaLabel: { color: "#666", marginRight: 6 },
  metaValue: { fontWeight: 700 },
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billTo: { marginBottom: 18 },
  billToLabel: { fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  billToValue: { fontSize: 12, fontWeight: 700 },
  table: { borderTop: "1pt solid #111", borderBottom: "1pt solid #111" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "1pt solid #111",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #ddd",
  },
  colDesc: { flex: 4 },
  colQty: { flex: 0.8, textAlign: "right" },
  colUnit: { flex: 1, textAlign: "left", paddingLeft: 6 },
  colPrice: { flex: 1.4, textAlign: "right" },
  colMonths: { flex: 0.8, textAlign: "right" },
  colTotal: { flex: 1.6, textAlign: "right", fontWeight: 700 },
  num: { fontFamily: "Helvetica" },
  totalsBlock: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsBox: { width: 240 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: "#444" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTop: "1pt solid #111",
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#666",
    borderTop: "0.5pt solid #ccc",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  termsBlock: { marginTop: 24, fontSize: 9, color: "#444" },
  termsLabel: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  diffPage: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  diffTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  diffSubtitle: { fontSize: 9, color: "#666", marginBottom: 12 },
  diffSummaryRow: { flexDirection: "row", marginBottom: 12, fontSize: 9 },
  diffSummaryAdd: { color: "#166534", marginRight: 12, fontWeight: 700 },
  diffSummaryDel: { color: "#991b1b", fontWeight: 700 },
  diffLine: { flexDirection: "row", paddingVertical: 1, paddingHorizontal: 2 },
  diffMarker: { width: 12, fontFamily: "Courier", fontWeight: 700 },
  diffText: { flex: 1, fontFamily: "Courier", fontSize: 9 },
  diffEq: {},
  diffAdd: { backgroundColor: "#dcfce7" },
  diffDel: { backgroundColor: "#fee2e2" },
  diffMarkerAdd: { color: "#166534" },
  diffMarkerDel: { color: "#991b1b" },
  diffMarkerEq: { color: "#999" },
  diffTextAdd: { color: "#14532d" },
  diffTextDel: { color: "#7f1d1d", textDecoration: "line-through" },
  diffTextEq: { color: "#444" },
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const statusColor = (s: string) => {
  switch (s.toLowerCase()) {
    case "accepted":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "sent":
      return { backgroundColor: "#dbeafe", color: "#1e3a8a" };
    default:
      return { backgroundColor: "#f4f4f5", color: "#3f3f46" };
  }
};

export function QuotationPdfDocument(props: QuotationPdfProps) {
  const { quotationNumber, companyName, clientName, date, status, vatRate, termsText, defaultTermsText } = props;
  const lineItems = props.lineItems.filter((item) => !item.isExcluded);

  const normalizedCustom = (termsText ?? "").trim();
  const normalizedDefault = (defaultTermsText ?? "").trim();
  const showDiff =
    normalizedDefault.length > 0 && normalizedCustom !== normalizedDefault;
  const diffParts = showDiff ? diffLines(normalizedDefault, normalizedCustom) : [];
  const diffStats = showDiff ? diffSummary(diffParts) : { added: 0, removed: 0 };

  const subtotal = lineItems.reduce(
    (acc, item) => acc + item.quantity * item.priceMonthly * item.totalMonths,
    0,
  );
  const vat = subtotal * vatRate;
  const grandTotal = subtotal + vat;

  return (
    <Document title={quotationNumber} author={companyName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {props.logoUrl ? (
              <Image src={props.logoUrl} style={styles.logoImage} />
            ) : null}
            <Text style={styles.companyName}>{companyName}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>QUOTATION</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Number:</Text>
              <Text style={styles.metaValue}>{quotationNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{format(new Date(date), "MMM d, yyyy")}</Text>
            </View>
            <Text style={[styles.badge, statusColor(status)]}>{status}</Text>
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToValue}>{clientName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colPrice}>Price/Unit</Text>
            <Text style={styles.colMonths}>Months</Text>
            <Text style={styles.colTotal}>Line Total</Text>
          </View>
          {lineItems.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={[styles.colQty, styles.num]}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={[styles.colPrice, styles.num]}>{fmt(item.priceMonthly)}</Text>
              <Text style={[styles.colMonths, styles.num]}>{item.totalMonths}</Text>
              <Text style={[styles.colTotal, styles.num]}>
                {fmt(item.quantity * item.priceMonthly * item.totalMonths)}
              </Text>
            </View>
          ))}
          {lineItems.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.colDesc, { color: "#999" }]}>No line items</Text>
            </View>
          )}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.num}>SAR {fmt(subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT ({+(vatRate * 100).toFixed(2)}%)</Text>
              <Text style={styles.num}>SAR {fmt(vat)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>Grand Total</Text>
              <Text style={styles.num}>SAR {fmt(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {termsText ? (
          <View style={styles.termsBlock}>
            <Text style={styles.termsLabel}>Terms &amp; Conditions</Text>
            <Text>{termsText}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>© 2026 Onasi-CloudTech. All Rights Reserved.</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {showDiff ? (
        <Page size="A4" style={styles.diffPage} wrap>
          <Text style={styles.diffTitle}>Terms &amp; Conditions — Changes vs Default</Text>
          <Text style={styles.diffSubtitle}>
            This appendix highlights how the terms used in this quotation differ
            from the company default.
          </Text>
          <View style={styles.diffSummaryRow}>
            <Text style={styles.diffSummaryAdd}>+{diffStats.added} added</Text>
            <Text style={styles.diffSummaryDel}>−{diffStats.removed} removed</Text>
          </View>
          <View>
            {diffParts.map((p, idx) => {
              const isBlank = p.text.length === 0;
              const lineStyle =
                p.type === "add"
                  ? styles.diffAdd
                  : p.type === "del"
                    ? styles.diffDel
                    : styles.diffEq;
              const markerStyle =
                p.type === "add"
                  ? styles.diffMarkerAdd
                  : p.type === "del"
                    ? styles.diffMarkerDel
                    : styles.diffMarkerEq;
              const textStyle =
                p.type === "add"
                  ? styles.diffTextAdd
                  : p.type === "del"
                    ? styles.diffTextDel
                    : styles.diffTextEq;
              const marker = p.type === "add" ? "+" : p.type === "del" ? "−" : " ";
              return (
                <View key={idx} style={[styles.diffLine, lineStyle]} wrap={false}>
                  <Text style={[styles.diffMarker, markerStyle]}>{marker}</Text>
                  <Text style={[styles.diffText, textStyle]}>
                    {isBlank ? " " : p.text}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.footer} fixed>
            <Text>© 2026 Onasi-CloudTech. All Rights Reserved.</Text>
            <Text
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
