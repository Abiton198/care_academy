import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportTeacherTimetablePDF = (teacherName: string, timetableData: any[]) => {
    const doc = new jsPDF("landscape");

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    // 1. EXTRACT ACTUAL TIMES FROM DATA
    // We get all unique 'time' values from the timetable documents and sort them
    const actualTimeSlots = Array.from(
        new Set(timetableData.map((slot) => slot.time))
    ).sort((a, b) => a.localeCompare(b));

    // 2. Map the data using Day and Time as keys
    const combinedStages = new Set(["Stage 4", "Stage 5"]);
    const scheduleMap: Record<string, string> = {};

    timetableData.forEach((slot) => {
        const key = `${slot.day}-${slot.time}`;
        const label = combinedStages.has(slot.grade) ? "Stage 4/5" : slot.grade;

        // If multiple lessons exist in one slot (that aren't 4/5), we append them
        if (scheduleMap[key] && !combinedStages.has(slot.grade)) {
            scheduleMap[key] += `\n& ${slot.subject} (${label})`;
        } else {
            scheduleMap[key] = `${slot.subject}\n(${label})`;
        }
    });

    // 3. Format rows based on actual discovered times
    const tableRows = actualTimeSlots.map((time) => {
        const row = [time];
        days.forEach((day) => {
            row.push(scheduleMap[`${day}-${time}`] || "");
        });
        return row;
    });

    // 4. Header
    doc.setFontSize(16);
    doc.text(`Weekly Timetable: ${teacherName}`, 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} • Actual School Times`, 14, 18);

    // 5. Generate Table
    autoTable(doc, {
        startY: 22,
        head: [["Time", ...days]],
        body: tableRows,
        theme: "grid",
        headStyles: {
            fillColor: [79, 70, 229],
            halign: "center",
            fontSize: 10
        },
        styles: {
            cellPadding: 3,
            fontSize: 8,
            valign: "middle",
            halign: "center",
            overflow: "linebreak",
            minCellHeight: 15, // Dynamic rows might be more numerous, so we reduce height slightly
        },
        margin: { left: 14, right: 14, bottom: 10 },
        didParseCell: (data) => {
            // Darken empty slots
            if (data.section === "body" && data.column.index !== 0 && !data.cell.text[0]) {
                data.cell.styles.fillColor = [40, 44, 52];
                data.cell.styles.cellPadding = 0;
            }
            // Highlight the time column
            if (data.column.index === 0 && data.section === "body") {
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [0, 0, 0];
            }
        },
    });

    doc.save(`${teacherName.replace(/\s+/g, "_")}_Timetable.pdf`);
};