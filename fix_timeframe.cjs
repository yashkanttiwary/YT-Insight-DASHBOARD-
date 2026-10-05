const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'useState<"weekly" | "monthly">(',
  'useState<"weekly" | "monthly" | "lifetime" | "yoy">('
);

const oldPeriods = `    if (reportTimeframe === "weekly") {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(
          now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
        );
        const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const startLabel = start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        periods.push({
          name: \`W\${4 - i}\`,
          label: \`\${startLabel} - \${endLabel}\`,
          start,
          end,
        });
      }
    } else {
      for (let i = 1; i >= 0; i--) {
        const start = new Date(
          now.getTime() - (i + 1) * 30 * 24 * 60 * 60 * 1000,
        );
        const end = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
        const startLabel = start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        periods.push({
          name: \`M\${2 - i}\`,
          label: \`\${startLabel} - \${endLabel}\`,
          start,
          end,
        });
      }
    }`;

const newPeriods = `    if (reportTimeframe === "weekly") {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(
          now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
        );
        const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const startLabel = start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        periods.push({
          name: \`W\${4 - i}\`,
          label: \`\${startLabel} - \${endLabel}\`,
          start,
          end,
        });
      }
    } else if (reportTimeframe === "monthly") {
      for (let i = 1; i >= 0; i--) {
        const start = new Date(
          now.getTime() - (i + 1) * 30 * 24 * 60 * 60 * 1000,
        );
        const end = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
        const startLabel = start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        periods.push({
          name: \`M\${2 - i}\`,
          label: \`\${startLabel} - \${endLabel}\`,
          start,
          end,
        });
      }
    } else if (reportTimeframe === "lifetime") {
      periods.push({
        name: "Lifetime",
        label: "All Time",
        start: new Date(0),
        end: now,
      });
    } else if (reportTimeframe === "yoy") {
      const pyStart = new Date(now.getFullYear() - 1, 0, 1);
      const pyEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      periods.push({
        name: \`\${now.getFullYear() - 1}\`,
        label: "Previous Year",
        start: pyStart,
        end: pyEnd,
      });
      const cyStart = new Date(now.getFullYear(), 0, 1);
      periods.push({
        name: \`\${now.getFullYear()}\`,
        label: "Current Year",
        start: cyStart,
        end: now,
      });
    }`;

code = code.replace(oldPeriods, newPeriods);

const oldButtons = `                    <button
                      onClick={() => setReportTimeframe("weekly")}
                      className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "weekly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setReportTimeframe("monthly")}
                      className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "monthly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}
                    >
                      Monthly
                    </button>`;

const newButtons = `                    <button
                      onClick={() => setReportTimeframe("weekly")}
                      className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "weekly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setReportTimeframe("monthly")}
                      className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "monthly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setReportTimeframe("yoy")}
                      className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "yoy" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}
                    >
                      YoY
                    </button>
                    <button
                      onClick={() => setReportTimeframe("lifetime")}
                      className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "lifetime" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}
                    >
                      Lifetime
                    </button>`;

code = code.replace(oldButtons, newButtons);

fs.writeFileSync('src/App.tsx', code);
