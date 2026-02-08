/**
 * GOOGLE APPS SCRIPT FOR TIME TRACKER (MONTHLY SPLIT + CUSTOM LAYOUT)
 * 
 * 1. Open your Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace EVERYTHING with this code.
 * 4. IMPORTANT: Run 'setup' function once to authorize.
 * 5. Deploy as Web App (Execute as "Me", Access: "Anyone").
 */

const COMPANY_NAME = "Zimmerei";
const GERMAN_MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function setup() {
  SpreadsheetApp.getUi().alert("Berechtigung erfolgreich erteilt!");
}

function formatSheet(sheet) {
  // Clear everything to ensure clean rewrite
  sheet.clear();
  
  // Header in A1
  sheet.getRange("A1").setValue(COMPANY_NAME).setFontWeight("bold").setFontSize(14);
  
  // Headers in Row 2
  const headers = ["Datum", "Von", "Bis", "Stunden", "Total", "Lohn netto", "ID (System)"];
  sheet.getRange(2, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#f3f3f3")
    .setBorder(true, true, true, true, true, true);
    
  sheet.setFrozenRows(2);
  
  // Format columns
  sheet.getRange("A:A").setNumberFormat("dd.MM.yyyy"); // Force column A to be date
  sheet.getRange("B:C").setNumberFormat("HH:mm");       // Force columns B/C to be time
  sheet.getRange("D:E").setNumberFormat("0.00");
  sheet.getRange("F:F").setNumberFormat("#,##0.00\" CHF\"");
  
  // Hide technical columns
  sheet.hideColumns(7); 
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let allEntries = [];
  
  sheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (data.length < 3) return; 
    if (data[1][0] !== "Datum") return;
    
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0] === "Total") continue;
        
        let dateVal = row[0];
        let fromVal = row[1];
        let toVal = row[2];

        // Ensure we send back strings that the app expects (YYYY-MM-DD and HH:mm)
        if (dateVal instanceof Date) {
          dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
        if (fromVal instanceof Date) {
          fromVal = Utilities.formatDate(fromVal, Session.getScriptTimeZone(), "HH:mm");
        }
        if (toVal instanceof Date) {
          toVal = Utilities.formatDate(toVal, Session.getScriptTimeZone(), "HH:mm");
        }
        
        allEntries.push({
          date: dateVal,
          from: fromVal,
          to: toVal,
          hours: parseFloat(row[3]) || 0,
          id: row[6] || Utilities.getUuid()
        });
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", entries: allEntries }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      // Fallback for different post body formats
      payload = JSON.parse(e.postData.contents || "{}");
    }
    
    const entries = payload.entries || [];
    const rawWage = payload.hourlyWage || (payload.settings && payload.settings.hourlyWage);
    const wage = parseFloat(rawWage) || 0;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. CLEAR ALL MONTHLY SHEETS FIRST (to ensure deletions are reflected)
    // We only clear sheets that match our Month Year pattern or have our header
    const sheets = ss.getSheets();
    sheets.forEach(s => {
      const name = s.getName();
      // Check if name is like "Januar 2026"
      const pts = name.split(" ");
      if (pts.length === 2 && GERMAN_MONTHS.indexOf(pts[0]) !== -1) {
        formatSheet(s);
      }
    });

    const groups = {};
    entries.forEach(entry => {
      let d;
      if (entry.date.includes('.')) {
        const pts = entry.date.split('.');
        d = new Date(pts[2], pts[1]-1, pts[0]);
      } else {
        d = new Date(entry.date);
      }
      
      const key = `${GERMAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    
    for (const key in groups) {
      groups[key].sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
      
      let sheet = ss.getSheetByName(key);
      if (!sheet) {
        sheet = ss.insertSheet(key);
        formatSheet(sheet);
      }
      // Note: formatSheet was already called above for existing month sheets
      
      if (groups[key].length > 0) {
        sheet.getRange("H1").setValue(wage);
        sheet.hideColumns(8);

        const rows = groups[key].map((entry, idx) => {
          const rowIdx = idx + 3;
          const hours = parseFloat(entry.hours) || 0;
          const totalFormula = idx === 0 ? `=D${rowIdx}` : `=E${rowIdx-1}+D${rowIdx}`;
          const wageFormula = idx === 0 ? `=D${rowIdx}*$H$1` : `=F${rowIdx-1}+(D${rowIdx}*$H$1)`;
          
          return [
            entry.date,
            entry.from,
            entry.to,
            hours,
            totalFormula, 
            wageFormula,
            entry.id
          ];
        });
        
        sheet.getRange(3, 1, rows.length, 7).setValues(rows);
        
        const summaryIdx = rows.length + 3;
        sheet.getRange(summaryIdx, 4).setValue("Total").setFontWeight("bold");
        sheet.getRange(summaryIdx, 5).setFormula(`=E${summaryIdx-1}`).setFontWeight("bold");
        sheet.getRange(summaryIdx, 6).setFormula(`=F${summaryIdx-1}`).setFontWeight("bold");
        sheet.getRange(summaryIdx, 1, 1, 6).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
