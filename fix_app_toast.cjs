const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/const showNotification = \([\s\S]*?setTimeout\(\(\) => setNotification\(null\), 4000\);\n  \};/m, `const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };`);

fs.writeFileSync('src/App.tsx', c);
