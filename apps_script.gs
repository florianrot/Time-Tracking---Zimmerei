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
  // Clear everything to avoid layout shifts or old data remnants
  sheet.clear();
  sheet.getRange("1:100").clearContent().clearFormat();
  
  // Row 1: Company Header
  sheet.getRange("A1").setValue(COMPANY_NAME).setFontWeight("bold").setFontSize(14);
  
  // Row 2: Headers
  // Columns: A=Datum, B=Von, C=Bis, D=Stunden, E=Total, f=Lohn netto, G=ID (System)
  const headers = ["Datum", "Von", "Bis", "Stunden", "Total", "Lohn netto", "ID (System)"];
  sheet.getRange(2, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#f3f3f3")
    .setBorder(true, true, true, true, true, true);
    
  // Freeze top rows
  sheet.setFrozenRows(2);
  
  // Set number formats
  sheet.getRange("D:D").setNumberFormat("0.00");
  sheet.getRange("E:E").setNumberFormat("0.00");
  sheet.getRange("F:F").setNumberFormat("#,##0.00\" CHF\"");
  
  // Hide technical columns (G=ID, H=Wage, I=Label)
  sheet.hideColumns(7, 3); 
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
        
        allEntries.push({
          date: row[0],
          from: row[1],
          to: row[2],
          hours: row[3],
          id: row[6] || Utilities.getUuid() // ID is now in column G (index 6)
        });
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", entries: allEntries }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const entries = payload.entries || [];
    const rawWage = payload.hourlyWage || (payload.settings && payload.settings.hourlyWage);
    const wage = parseFloat(rawWage) || 0;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const groups = {};
    
    entries.forEach(entry => {
      const d = new Date(entry.date);
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
      } else {
        formatSheet(sheet);
      }
      
      if (groups[key].length > 0) {
        // Write wage to diagnostic cells H1/I1 (hidden)
        sheet.getRange("H1").setValue(wage).setNumberFormat("0.00");
        sheet.getRange("I1").setValue("CHF/h (Sync)");

        const rows = groups[key].map((entry, idx) => {
          const rowIdx = idx + 3;
          const hours = parseFloat(entry.hours) || 0;
          
          const totalFormula = idx === 0 ? `=D${rowIdx}` : `=E${rowIdx-1}+D${rowIdx}`;
          const wageFormula = idx === 0 ? `=D${rowIdx}*$H$1` : `=F${rowIdx-1}+(D${rowIdx}*$H$1)`;
          
          return [
            formatDateGerman(entry.date),
            entry.from,
            entry.to,
            hours,
            totalFormula, 
            wageFormula,
            entry.id // ID in column G
          ];
        });
        
        // Write data rows
        sheet.getRange(3, 1, rows.length, 7).setValues(rows);
        
        // Add Summary Row
        const summaryIdx = rows.length + 3;
        sheet.getRange(summaryIdx, 4).setValue("Total").setFontWeight("bold");
        sheet.getRange(summaryIdx, 5).setFormula(`=E${summaryIdx-1}`).setFontWeight("bold");
        sheet.getRange(summaryIdx, 6).setFormula(`=F${summaryIdx-1}`).setFontWeight("bold");
        
        // Add thick line above summary
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

function formatDateGerman(isoStr) {
  if (isoStr instanceof Date) {
    return Utilities.formatDate(isoStr, Session.getScriptTimeZone(), "dd.MM.yyyy");
  }
  const parts = isoStr.toString().split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
