# Login Fix — Replace these 3 files

The SVG replacement in the previous patch accidentally injected SVG HTML
(<, >, /) into JavaScript template literals (backtick strings), causing
runtime crashes that fell into the login catch block showing "Login failed."

Firebase Auth was succeeding (hence "Welcome back, Tega!" toast) but the
crash in enterApp() triggered the catch handler.

Fixed files:
- 11-wallet.js  — tx-row, openReceive, processTopUp toasts
- 14-ai-validation.js — skill submit modal and toast  
- 21-admin.js  — approve/reject toasts, CAT_ICONS template
