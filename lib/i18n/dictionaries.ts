import type { Locale } from "./config";

const en = {
    appName: "Whisper",
    tagline: "Meet, talk, and whisper privately.",
    language: "Language",
    theme: {
        label: "Theme",
        light: "Light",
        dark: "Dark",
        system: "System",
    },
    home: {
        heading: "Private conversations, inside the same room.",
        subheading:
            "Start a room and share the code. Anyone in the room can pull another person aside for a private whisper without leaving the conversation.",
        createTitle: "New room",
        createDescription: "Create a room and invite others with a code.",
        createAction: "Create a room",
        joinTitle: "Join a room",
        joinDescription: "Enter the code you were given.",
        joinAction: "Join",
        codeLabel: "Room code",
        codePlaceholder: "abc-defg-hij",
        invalidCode: "That does not look like a valid room code.",
        orDivider: "or",
        featureWhisperTitle: "Real private whispers",
        featureWhisperBody:
            "Whisper audio never reaches anyone outside the pair - the media server refuses to forward it.",
        featureDuckTitle: "The room stays audible",
        featureDuckBody:
            "While whispering, the main conversation drops to a murmur instead of disappearing.",
        featureNoAccountTitle: "No account needed",
        featureNoAccountBody:
            "Pick a display name and you are in. Rooms disappear when everyone leaves.",
        rejoinTitle: "Rejoin your last room",
        rejoinNote: "This room may have already ended.",
        rejoinAction: "Rejoin",
        rejoinDismiss: "Dismiss",
    },
    prejoin: {
        heading: "Ready to join?",
        room: "Room",
        nameLabel: "Your name",
        namePlaceholder: "Enter your display name",
        nameRequired: "Please enter a name.",
        micLabel: "Microphone",
        join: "Join now",
        joining: "Joining…",
        back: "Back",
        permissionHint: "Your browser will ask for microphone access.",
    },
    room: {
        participants: "People",
        participantCount: (n: number) => (n === 1 ? "1 person" : `${n} people`),
        you: "You",
        creator: "Host",
        copyLink: "Copy invite link",
        copied: "Invite link copied",
        leave: "Leave",
        muteMic: "Mute microphone",
        unmuteMic: "Unmute microphone",
        muted: "Muted",
        unmutedLabel: "Microphone on",
        speaking: "Speaking",
        connecting: "Connecting to the room…",
        reconnecting: "Connection lost - reconnecting…",
        emptyState:
            "You are the only one here. Share the invite link to bring people in.",
        whisperTo: (name: string) => `Whisper to ${name}`,
        stopWhisper: (name: string) => `Stop whispering to ${name}`,
        whisperBusy: (name: string) =>
            `${name} is already whispering with someone else`,
        whisperingWith: (name: string) => `Whispering with ${name}`,
        whisperingWithOther: (a: string, b: string) =>
            `${a} is whispering with ${b}`,
        whisperInvitePending: (name: string) => `Waiting for ${name}…`,
        whisperBannerTitle: "Whisper mode",
        whisperBannerBody: (name: string) =>
            `Only ${name} can hear you. The room is quieter and cannot hear this.`,
        whisperEnded: "Whisper ended",
        whisperStarted: (name: string) => `You are now whispering with ${name}`,
        whisperDeclined: (name: string) => `${name} could not join the whisper`,
        audioBlocked: "Click to enable audio",
        micDenied:
            "Microphone access was denied. Enable it in your browser settings and reload.",
        connectFailed: "Could not connect to the room.",
        retry: "Try again",
        cancel: "Cancel",
        leaveTitle: "Leave this room?",
        leaveBody:
            "You will be disconnected. You can rejoin with the same code.",
        leaveConfirm: "Leave",
        switchTitle: "Switch whisper?",
        switchBody: (from: string, to: string) =>
            `You are whispering with ${from}. Starting a whisper with ${to} will end it.`,
        switchConfirm: "Switch",
        volume: {
            label: "Audio levels",
            room: "Room",
            others: "Others",
            whisper: "Whisper",
            hint: "Adjust how loud the room and your whisper are here.",
        },
    },
    errors: {
        missingConfig: "The server is not configured for LiveKit yet.",
        generic: "Something went wrong.",
    },
};

export type Dictionary = typeof en;

const ar: Dictionary = {
    appName: "همس",
    tagline: "اجتمع، وتحدث، وهامس بخصوصية.",
    language: "اللغة",
    theme: {
        label: "المظهر",
        light: "فاتح",
        dark: "داكن",
        system: "النظام",
    },
    home: {
        heading: "محادثات خاصة، داخل الغرفة نفسها.",
        subheading:
            "أنشئ غرفة وشارك الرمز. يمكن لأي شخص في الغرفة أن يهامس شخصًا آخر على انفراد دون مغادرة المحادثة.",
        createTitle: "غرفة جديدة",
        createDescription: "أنشئ غرفة وادعُ الآخرين برمز.",
        createAction: "إنشاء غرفة",
        joinTitle: "الانضمام إلى غرفة",
        joinDescription: "أدخل الرمز الذي وصلك.",
        joinAction: "انضمام",
        codeLabel: "رمز الغرفة",
        codePlaceholder: "abc-defg-hij",
        invalidCode: "هذا لا يبدو رمز غرفة صالحًا.",
        orDivider: "أو",
        featureWhisperTitle: "همس خاص فعليًا",
        featureWhisperBody:
            "لا يصل صوت الهمس إلى أي شخص خارج الثنائي - خادم الوسائط يرفض تمريره.",
        featureDuckTitle: "الغرفة تبقى مسموعة",
        featureDuckBody:
            "أثناء الهمس، ينخفض صوت المحادثة الرئيسية إلى همهمة بدل أن يختفي.",
        featureNoAccountTitle: "بدون حساب",
        featureNoAccountBody:
            "اختر اسمًا للعرض وادخل. تختفي الغرف عند مغادرة الجميع.",
        rejoinTitle: "العودة إلى غرفتك الأخيرة",
        rejoinNote: "قد تكون هذه الغرفة قد انتهت بالفعل.",
        rejoinAction: "عودة",
        rejoinDismiss: "تجاهل",
    },
    prejoin: {
        heading: "جاهز للانضمام؟",
        room: "الغرفة",
        nameLabel: "اسمك",
        namePlaceholder: "أدخل الاسم الظاهر",
        nameRequired: "الرجاء إدخال اسم.",
        micLabel: "الميكروفون",
        join: "انضم الآن",
        joining: "جارٍ الانضمام…",
        back: "رجوع",
        permissionHint: "سيطلب المتصفح إذن الوصول إلى الميكروفون.",
    },
    room: {
        participants: "الأشخاص",
        participantCount: (n: number) => (n === 1 ? "شخص واحد" : `${n} أشخاص`),
        you: "أنت",
        creator: "المضيف",
        copyLink: "نسخ رابط الدعوة",
        copied: "تم نسخ رابط الدعوة",
        leave: "مغادرة",
        muteMic: "كتم الميكروفون",
        unmuteMic: "إلغاء كتم الميكروفون",
        muted: "مكتوم",
        unmutedLabel: "الميكروفون يعمل",
        speaking: "يتحدث",
        connecting: "جارٍ الاتصال بالغرفة…",
        reconnecting: "انقطع الاتصال - جارٍ إعادة الاتصال…",
        emptyState: "أنت الوحيد هنا. شارك رابط الدعوة لانضمام الآخرين.",
        whisperTo: (name: string) => `همس إلى ${name}`,
        stopWhisper: (name: string) => `إيقاف الهمس مع ${name}`,
        whisperBusy: (name: string) => `${name} يهامس شخصًا آخر بالفعل`,
        whisperingWith: (name: string) => `تهامس ${name}`,
        whisperingWithOther: (a: string, b: string) => `${a} يهامس ${b}`,
        whisperInvitePending: (name: string) => `في انتظار ${name}…`,
        whisperBannerTitle: "وضع الهمس",
        whisperBannerBody: (name: string) =>
            `${name} وحده يسمعك. الغرفة أهدأ ولا تسمع هذا.`,
        whisperEnded: "انتهى الهمس",
        whisperStarted: (name: string) => `أنت الآن تهامس ${name}`,
        whisperDeclined: (name: string) =>
            `تعذر على ${name} الانضمام إلى الهمس`,
        audioBlocked: "اضغط لتفعيل الصوت",
        micDenied:
            "تم رفض الوصول إلى الميكروفون. فعّله من إعدادات المتصفح ثم أعد التحميل.",
        connectFailed: "تعذر الاتصال بالغرفة.",
        retry: "إعادة المحاولة",
        cancel: "إلغاء",
        leaveTitle: "مغادرة هذه الغرفة؟",
        leaveBody: "سيتم قطع اتصالك. يمكنك العودة بالرمز نفسه.",
        leaveConfirm: "مغادرة",
        switchTitle: "تبديل الهمس؟",
        switchBody: (from: string, to: string) =>
            `أنت تهامس ${from}. بدء الهمس مع ${to} سينهي ذلك.`,
        switchConfirm: "تبديل",
        volume: {
            label: "مستويات الصوت",
            room: "الغرفة",
            others: "الآخرون",
            whisper: "الهمس",
            hint: "اضبط من هنا مستوى صوت الغرفة والهمس.",
        },
    },
    errors: {
        missingConfig: "الخادم غير مهيأ لـ LiveKit بعد.",
        generic: "حدث خطأ ما.",
    },
};

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale];
}
