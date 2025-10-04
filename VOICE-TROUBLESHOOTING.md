# 🔧 Voice Chat Troubleshooting Guide

## 🚨 Error: "No speech detected"

If you're getting this error, follow these steps to diagnose the issue:

---

## 🔍 Step 1: Check Browser Console

1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Click the microphone button
4. Look for these messages:

### ✅ Good Signs (Working):
```
🎤 Voice recognition started...
🎤 Speech recognition started
🗣️ Speech detected
⏳ Interim transcript: "hello"
✅ Final transcript: "hello"
🛑 Speech recognition ended
📝 Full transcript: "hello"
```

### ❌ Bad Signs (Not Working):
```
❌ No "Speech detected" message
❌ No interim/final transcripts
❌ Errors about permissions
❌ Network errors
```

---

## 🌐 Step 2: Check Your Browser

### Supported Browsers:
| Browser | Supported | Notes |
|---------|-----------|-------|
| **Chrome** | ✅ Yes | **Best choice** |
| **Edge** | ✅ Yes | **Best choice** |
| **Safari** | ⚠️ Limited | Sometimes works |
| **Firefox** | ❌ No | Not supported |
| **Opera** | ✅ Yes | Based on Chrome |
| **Brave** | ✅ Yes | Based on Chrome |

### ❌ If Using Firefox:
Firefox doesn't support Web Speech API. **Solutions:**
1. Switch to Chrome or Edge (recommended)
2. Add OpenAI API key for paid transcription (see below)

---

## 🎤 Step 3: Check Microphone Permissions

### Chrome/Edge:
1. Look for 🎤 icon in address bar (left side)
2. Click it
3. Make sure it says "Allow" (not "Block")
4. If blocked, click "Allow" and reload page

### Check System Microphone:
1. **Windows:** Settings → Privacy → Microphone → Allow apps
2. **Mac:** System Preferences → Security & Privacy → Microphone
3. Make sure your browser has permission

### Test Microphone:
Try recording in another app (like Voice Recorder) to confirm mic works.

---

## 📶 Step 4: Check Internet Connection

**Web Speech API requires internet!**

The free browser API uses Google's servers in the cloud. Test:
1. Open https://www.google.com
2. Make sure you can load pages
3. Check you're not behind a restrictive firewall

---

## 🔊 Step 5: Test Microphone Volume

### Windows:
1. Right-click speaker icon in taskbar
2. Open Sound settings
3. Go to Input
4. Speak and watch the volume bar
5. Make sure it's detecting sound

### Mac:
1. System Preferences → Sound
2. Input tab
3. Speak and watch the input level
4. Adjust volume if needed

---

## 🧪 Step 6: Try This Test

### Manual Test:
1. Open Chrome/Edge
2. Go to: https://www.google.com
3. Click the 🎤 in the search box
4. Speak
5. See if Google transcribes your speech

**If Google's mic doesn't work, your browser/mic has issues.**

---

## 💡 Step 7: Common Fixes

### Fix 1: Reload the Page
- Press **Ctrl+R** (Windows) or **Cmd+R** (Mac)
- Try the microphone again

### Fix 2: Clear Browser Cache
1. **Chrome/Edge:** Ctrl+Shift+Delete
2. Clear "Cached images and files"
3. Reload page

### Fix 3: Update Browser
1. Check for browser updates
2. Install latest version
3. Restart browser

### Fix 4: Try Incognito/Private Mode
1. Open incognito window: **Ctrl+Shift+N**
2. Go to your app
3. Allow microphone permission
4. Try voice input

### Fix 5: Restart Browser
1. Close ALL browser windows
2. Reopen browser
3. Try again

### Fix 6: Check Antivirus/Firewall
- Some antivirus software blocks microphone
- Temporarily disable and test
- Add exception for your browser

---

## 🔧 Advanced Troubleshooting

### Check Browser Support Manually:

Open browser console (F12) and type:

```javascript
// Check if Web Speech API is available
console.log('SpeechRecognition:', 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

// Check microphone permission
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Microphone access granted'))
  .catch(err => console.log('❌ Microphone error:', err.message));
```

Expected output:
```
SpeechRecognition: true
✅ Microphone access granted
```

---

## 🆘 Still Not Working? Use Paid Version

If free voice recognition won't work, you can use OpenAI Whisper:

### Setup OpenAI Whisper:

1. **Get API Key:**
   - Go to: https://platform.openai.com/api-keys
   - Create new key (starts with `sk-`)

2. **Add to `.env.local`:**
   ```bash
   OPENAI_API_KEY=sk-your_key_here
   ```

3. **Update Code:**
   In `components/chat/ChatPanel.tsx`, change:
   ```tsx
   const { ... } = useVoiceChat({
     useBrowserSpeechAPI: false, // Use paid Whisper instead
     ...
   });
   ```

4. **Restart Server:**
   ```bash
   npm run dev
   ```

**Cost:** $0.006 per minute (~$3 for 500 queries)

---

## 📋 Diagnostic Checklist

Work through this checklist:

- [ ] Using Chrome or Edge (not Firefox)
- [ ] Browser is updated to latest version
- [ ] Microphone permission is granted
- [ ] Microphone works in other apps
- [ ] Internet connection is working
- [ ] No firewall blocking microphone
- [ ] Console shows "Speech detected" messages
- [ ] Tried reloading the page
- [ ] Tried incognito mode
- [ ] Tried restarting browser

---

## 🐛 Known Issues

### Issue: "Speech detected" but no transcript
**Cause:** Poor audio quality or background noise  
**Fix:**
- Use headset microphone
- Move to quieter room
- Speak louder and clearer

### Issue: Works randomly
**Cause:** Unstable internet connection  
**Fix:**
- Check internet stability
- Try wired connection instead of WiFi
- Use paid Whisper API (doesn't depend on Google)

### Issue: Permission prompt doesn't appear
**Cause:** Browser settings blocking prompts  
**Fix:**
- Check browser settings → Site settings
- Remove any blocks for your site
- Try incognito mode

---

## 💻 System Requirements

### Minimum:
- Modern browser (Chrome/Edge latest version)
- Working microphone
- Internet connection
- Microphone permissions granted

### Recommended:
- Chrome or Edge (latest)
- Good quality USB or headset microphone
- Stable internet connection (5+ Mbps)
- Quiet environment

---

## 📞 Getting Help

### Before Asking for Help, Provide:

1. **Browser & Version:**
   - Example: "Chrome 120" or "Edge 119"
   - Check: browser menu → Help → About

2. **Operating System:**
   - Example: "Windows 11" or "macOS Sonoma"

3. **Console Messages:**
   - Press F12 → Console tab
   - Copy any error messages

4. **Microphone Test Result:**
   - Does Google search voice work?
   - Does mic work in other apps?

5. **Checklist Status:**
   - Which items you've tried
   - What happened

---

## 🎯 Quick Reference

| Symptom | Most Likely Cause | Quick Fix |
|---------|-------------------|-----------|
| No permission prompt | Already blocked | Click 🎤 icon in address bar |
| "No speech detected" | Microphone not working | Test mic in system settings |
| Works in Google, not here | Cache/browser issue | Clear cache, reload page |
| Immediate error | Wrong browser | Use Chrome or Edge |
| Intermittent issues | Poor internet | Check connection stability |

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Permission prompt appears (first time)
- ✅ Microphone button turns red when clicked
- ✅ Console shows "Speech detected" message
- ✅ You see interim transcripts in console
- ✅ Final transcript appears and is sent
- ✅ AI responds with voice

---

## 🔬 Debug Mode

Want more detailed logs? Add this to your `.env.local`:

```bash
NEXT_PUBLIC_DEBUG_VOICE=true
```

This will show more detailed console messages.

---

**Still stuck? Open browser console (F12) and share the error messages!** 🐛

