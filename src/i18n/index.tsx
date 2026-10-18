import { createContext, useContext, useState, ReactNode } from 'react'
export type Lang = 'en' | 'hi' | 'mr'
// First-draft translations written without a native-speaker review. Have a Hindi and a Marathi speaker check them before customers see them.
const D: Record<'hi' | 'mr', Record<string, string>> = {
  hi: { 'Overview': 'अवलोकन', 'Projects': 'प्रोजेक्ट', 'Permits & Approvals': 'परमिट और मंज़ूरियाँ', 'Net Metering': 'नेट मीटरिंग', 'CAD & Documents': 'CAD और दस्तावेज़', 'Installation Tasks': 'इंस्टॉलेशन कार्य', 'Contractors': 'ठेकेदार', 'Payments': 'भुगतान',
    'Weather Planner': 'मौसम योजना', 'Subsidy Readiness': 'सब्सिडी तैयारी', 'Cash-flow Forecast': 'नकदी प्रवाह अनुमान', 'After Installation': 'इंस्टॉलेशन के बाद', 'Reports & Analytics': 'रिपोर्ट और विश्लेषण', 'Notifications': 'सूचनाएँ', 'Settings': 'सेटिंग्स', 'Equipment': 'उपकरण', 'Rejections': 'अस्वीकृतियाँ', 'Create Project': 'प्रोजेक्ट बनाएँ',
    'Total Projects': 'कुल प्रोजेक्ट', 'Active Installations': 'चालू इंस्टॉलेशन', 'Pending Permit Items': 'लंबित परमिट आइटम', 'Pending Net-Metering': 'लंबित नेट मीटरिंग', 'Overdue Tasks': 'देर से चल रहे कार्य', 'Unpaid Milestones (Rs)': 'बकाया माइलस्टोन (रु.)', 'Status distribution': 'स्थिति वितरण', 'Project progress': 'प्रोजेक्ट प्रगति',
    'Draft': 'ड्राफ्ट', 'Planning': 'योजना', 'Permitting': 'परमिट प्रक्रिया', 'Design': 'डिज़ाइन', 'Ready for Installation': 'इंस्टॉलेशन के लिए तैयार', 'Installation in Progress': 'इंस्टॉलेशन जारी', 'Inspection': 'निरीक्षण', 'Commissioning': 'कमीशनिंग', 'Completed': 'पूर्ण', 'On Hold': 'रोका गया',
    'Utility application': 'बिजली कंपनी का आवेदन', 'Last updated': 'अंतिम अपडेट', 'In this stage for {n} days.': 'इस चरण में {n} दिन से।',
    'We are preparing your utility application.': 'हम आपका बिजली कंपनी का आवेदन तैयार कर रहे हैं।', 'We are gathering the documents the utility needs.': 'बिजली कंपनी को जो दस्तावेज़ चाहिए, हम उन्हें जुटा रहे हैं।', 'Your application is ready and will be submitted shortly.': 'आपका आवेदन तैयार है और जल्द जमा किया जाएगा।',
    'Your application has been submitted and is waiting for the utility to review it.': 'आपका आवेदन जमा हो चुका है और बिजली कंपनी की समीक्षा की प्रतीक्षा में है।', 'The utility is reviewing your application.': 'बिजली कंपनी आपके आवेदन की समीक्षा कर रही है।', 'An inspection has been scheduled.': 'निरीक्षण की तारीख तय हो गई है।',
    'Your application is approved. The meter and grid connection are being arranged.': 'आपका आवेदन मंज़ूर हो गया है। मीटर और ग्रिड कनेक्शन की व्यवस्था की जा रही है।', 'The utility asked for changes. We are fixing and resubmitting.': 'बिजली कंपनी ने बदलाव माँगे हैं। हम उन्हें ठीक करके दोबारा जमा कर रहे हैं।', 'Your system is connected to the grid.': 'आपका सिस्टम ग्रिड से जुड़ गया है।',
    "Status is entered by your installer and may differ from the utility's own records.": 'स्थिति आपके इंस्टॉलर द्वारा दर्ज की जाती है और बिजली कंपनी के अपने रिकॉर्ड से अलग हो सकती है।', 'This link is not valid or has been turned off.': 'यह लिंक मान्य नहीं है या बंद कर दी गई है।', 'Loading…': 'लोड हो रहा है…' },
  mr: { 'Overview': 'आढावा', 'Projects': 'प्रकल्प', 'Permits & Approvals': 'परवानग्या आणि मंजुरी', 'Net Metering': 'नेट मीटरिंग', 'CAD & Documents': 'CAD आणि कागदपत्रे', 'Installation Tasks': 'इन्स्टॉलेशन कामे', 'Contractors': 'कंत्राटदार', 'Payments': 'देयके',
    'Weather Planner': 'हवामान नियोजन', 'Subsidy Readiness': 'सबसिडी तयारी', 'Cash-flow Forecast': 'रोख प्रवाह अंदाज', 'After Installation': 'इन्स्टॉलेशननंतर', 'Reports & Analytics': 'अहवाल आणि विश्लेषण', 'Notifications': 'सूचना', 'Settings': 'सेटिंग्ज', 'Equipment': 'उपकरणे', 'Rejections': 'नाकारलेले अर्ज', 'Create Project': 'प्रकल्प तयार करा',
    'Total Projects': 'एकूण प्रकल्प', 'Active Installations': 'सुरू असलेली इन्स्टॉलेशन्स', 'Pending Permit Items': 'प्रलंबित परवानगी बाबी', 'Pending Net-Metering': 'प्रलंबित नेट मीटरिंग', 'Overdue Tasks': 'उशिरा झालेली कामे', 'Unpaid Milestones (Rs)': 'न दिलेले टप्पे (रु.)', 'Status distribution': 'स्थितीचे वितरण', 'Project progress': 'प्रकल्प प्रगती',
    'Draft': 'मसुदा', 'Planning': 'नियोजन', 'Permitting': 'परवानगी प्रक्रिया', 'Design': 'डिझाइन', 'Ready for Installation': 'इन्स्टॉलेशनसाठी तयार', 'Installation in Progress': 'इन्स्टॉलेशन सुरू', 'Inspection': 'तपासणी', 'Commissioning': 'कमिशनिंग', 'Completed': 'पूर्ण', 'On Hold': 'थांबवले',
    'Utility application': 'वीज कंपनीचा अर्ज', 'Last updated': 'शेवटचे अपडेट', 'In this stage for {n} days.': 'या टप्प्यात {n} दिवसांपासून.',
    'We are preparing your utility application.': 'आम्ही तुमचा वीज कंपनीचा अर्ज तयार करत आहोत.', 'We are gathering the documents the utility needs.': 'वीज कंपनीला आवश्यक असलेली कागदपत्रे आम्ही गोळा करत आहोत.', 'Your application is ready and will be submitted shortly.': 'तुमचा अर्ज तयार आहे आणि लवकरच सादर केला जाईल.',
    'Your application has been submitted and is waiting for the utility to review it.': 'तुमचा अर्ज सादर झाला आहे आणि वीज कंपनीच्या तपासणीची वाट पाहत आहे.', 'The utility is reviewing your application.': 'वीज कंपनी तुमच्या अर्जाची तपासणी करत आहे.', 'An inspection has been scheduled.': 'तपासणीची वेळ ठरली आहे.',
    'Your application is approved. The meter and grid connection are being arranged.': 'तुमचा अर्ज मंजूर झाला आहे. मीटर आणि ग्रिड कनेक्शनची व्यवस्था केली जात आहे.', 'The utility asked for changes. We are fixing and resubmitting.': 'वीज कंपनीने बदल मागितले आहेत. आम्ही ते दुरुस्त करून पुन्हा सादर करत आहोत.', 'Your system is connected to the grid.': 'तुमची प्रणाली ग्रिडशी जोडली गेली आहे.',
    "Status is entered by your installer and may differ from the utility's own records.": 'स्थिती तुमच्या इन्स्टॉलरने नोंदवलेली असते आणि वीज कंपनीच्या स्वतःच्या नोंदींपेक्षा वेगळी असू शकते.', 'This link is not valid or has been turned off.': 'ही लिंक वैध नाही किंवा बंद केली आहे.', 'Loading…': 'लोड होत आहे…' } }
interface C { lang: Lang; setLang: (l: Lang) => void; t: (s: string, v?: Record<string, string | number>) => string }
const X = createContext<C>({ lang: 'en', setLang: () => {}, t: s => s })
export const useT = () => useContext(X)
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(() => { try { const v = localStorage.getItem('lang'); return v === 'hi' || v === 'mr' ? v : 'en' } catch { return 'en' } })
  const setLang = (l: Lang) => { set(l); try { localStorage.setItem('lang', l) } catch { /* storage unavailable */ } }
  const t = (s: string, v?: Record<string, string | number>) => { let o = lang === 'en' ? s : D[lang][s] ?? s; if (v) for (const k of Object.keys(v)) o = o.replace(`{${k}}`, String(v[k])); return o }
  return <X.Provider value={{ lang, setLang, t }}>{children}</X.Provider>
}
export function LangSwitch() {
  const { lang, setLang } = useT()
  return <select className="input !w-auto !py-1.5" aria-label="Language" value={lang} onChange={e => setLang(e.target.value as Lang)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select>
}
