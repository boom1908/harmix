import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const target = path.resolve(
  "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/CapacitorWebView.java",
);

if (!existsSync(target)) {
  console.log("Capacitor Android WebView source not found; skipping input bridge patch.");
  process.exit(0);
}

let source = readFileSync(target, "utf8");

if (source.includes("Harmix Android input fix")) {
  console.log("Capacitor Android input bridge patch already applied.");
  process.exit(0);
}

if (!source.includes("import org.json.JSONObject;")) {
  source = source.replace("import androidx.core.view.WindowInsetsCompat;", "import androidx.core.view.WindowInsetsCompat;\nimport org.json.JSONObject;");
}

const original = `    @Override
    @SuppressWarnings("deprecation")
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_MULTIPLE) {
            evaluateJavascript("document.activeElement.value = document.activeElement.value + '" + event.getCharacters() + "';", null);
            return false;
        }
        return super.dispatchKeyEvent(event);
    }
`;

const replacement = `    @Override
    @SuppressWarnings("deprecation")
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_MULTIPLE) {
            String characters = event.getCharacters();
            if (characters != null && !characters.isEmpty()) {
                // Harmix Android input fix: some keyboards send text through ACTION_MULTIPLE.
                // Capacitor's default bridge only changes the DOM value, which React controlled
                // inputs do not reliably see. Also dispatch input/change so the app state updates.
                String text = JSONObject.quote(characters);
                String script = "(function(){" +
                    "var el=document.activeElement;" +
                    "if(!el||!('value' in el))return;" +
                    "var value=String(el.value||'');" +
                    "var start=typeof el.selectionStart==='number'?el.selectionStart:value.length;" +
                    "var end=typeof el.selectionEnd==='number'?el.selectionEnd:start;" +
                    "var text=" + text + ";" +
                    "el.value=value.slice(0,start)+text+value.slice(end);" +
                    "var pos=start+text.length;" +
                    "try{el.setSelectionRange(pos,pos);}catch(e){}" +
                    "try{el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}" +
                    "catch(e){el.dispatchEvent(new Event('input',{bubbles:true}));}" +
                    "el.dispatchEvent(new Event('change',{bubbles:true}));" +
                    "})();";
                evaluateJavascript(script, null);
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }
`;

if (!source.includes(original)) {
  throw new Error("Could not find Capacitor dispatchKeyEvent block to patch.");
}

writeFileSync(target, source.replace(original, replacement));
console.log("Patched Capacitor Android input bridge for React/WebView text fields.");