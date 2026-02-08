/**
 * Excel Export Styles Configuration
 */
const EXCEL_STYLES = {
    // Column widths in characters
    // Column widths in characters
    COLUMN_WIDTHS: [
        { wch: 12 }, // Datum
        { wch: 10 }, // Von
        { wch: 10 }, // Bis
        { wch: 10 }, // Stunden
        { wch: 15 }  // Lohn netto
    ],

    // Cell merges
    MERGES: [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } } // Header title merge (A-D)
    ],

    // Number formats
    FORMATS: {
        DATE: 'dd.mm.yyyy',
        TIME: 'hh:mm',
        HOURS: '0.00',
        CURRENCY: '#,##0.00 "CHF"'
    },

    // Header labels
    HEADER_LABELS: ['Datum', 'Von', 'Bis', 'Stunden', 'Lohn netto'],

    // Column Names
    COL_NAMES: ['A', 'B', 'C', 'D', 'E'],

    // Cell Styles (Requires xlsx-js-style library for these to take effect)
    CELL_STYLES: {
        TITLE: {
            font: { bold: true, sz: 16 }
        },
        HEADER: {
            font: { bold: true },
            border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" }
            },
            alignment: { horizontal: "center" }
        },
        DATA_LEFT: {
            alignment: { horizontal: "left" }
        },
        DATA_CENTER: {
            alignment: { horizontal: "center" }
        },
        DATA_RIGHT: {
            alignment: { horizontal: "right" }
        },
        TOTAL: {
            font: { bold: true },
            border: {
                top: { style: "thick" }
            },
            alignment: { horizontal: "right" }
        },
        TOTAL_EMPTY: {
            border: {
                top: { style: "thick" }
            }
        },
        TOTAL_LABEL: {
            font: { bold: true },
            border: {
                top: { style: "thick" }
            },
            alignment: { horizontal: "right" }
        }
    }
};
