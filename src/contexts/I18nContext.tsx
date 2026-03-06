import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// Supported languages
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de';

export interface LanguageInfo {
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    flag: string;
    rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

// Translation key type - nested object paths
type TranslationKey = string;

// Context interface
interface I18nContextValue {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
    formatDate: (date: Date | string, format?: 'short' | 'long' | 'relative') => string;
    formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
    languageInfo: LanguageInfo;
    isLoading: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Translation storage
const translations: Record<SupportedLanguage, Record<string, any>> = {
    en: {},
    es: {},
    fr: {},
    de: {},
};

// Default English translations (inline for immediate availability)
translations.en = {
    common: {
        loading: 'Loading...',
        error: 'An error occurred',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        refresh: 'Refresh',
        viewAll: 'View all',
        showMore: 'Show more',
        showLess: 'Show less',
        yes: 'Yes',
        no: 'No',
        or: 'or',
        and: 'and',
    },
    auth: {
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        forgotPassword: 'Forgot password?',
        resetPassword: 'Reset Password',
        createAccount: 'Create Account',
        alreadyHaveAccount: 'Already have an account?',
        dontHaveAccount: "Don't have an account?",
        termsAgree: 'I agree to the Terms of Service and Privacy Policy',
    },
    navigation: {
        home: 'Home',
        rides: 'Rides',
        messages: 'Messages',
        profile: 'Profile',
        settings: 'Settings',
        help: 'Help',
        about: 'About',
    },
    rides: {
        findRide: 'Find a Ride',
        offerRide: 'Offer a Ride',
        myRides: 'My Rides',
        upcomingRides: 'Upcoming Rides',
        pastRides: 'Past Rides',
        from: 'From',
        to: 'To',
        date: 'Date',
        time: 'Time',
        seats: 'Seats',
        seatsAvailable: '{{count}} seats available',
        price: 'Price',
        freeRide: 'Free',
        fuelContribution: 'Fuel Contribution',
        bookRide: 'Book Ride',
        cancelRide: 'Cancel Ride',
        rideDetails: 'Ride Details',
        driver: 'Driver',
        passengers: 'Passengers',
        noRidesFound: 'No rides found',
        searchAgain: 'Try adjusting your search criteria',
        rideBooked: 'Ride booked successfully!',
        rideCancelled: 'Ride cancelled',
        recurring: 'Recurring ride',
        oneTime: 'One-time ride',
    },
    profile: {
        editProfile: 'Edit Profile',
        myProfile: 'My Profile',
        fullName: 'Full Name',
        phoneNumber: 'Phone Number',
        bio: 'Bio',
        vehicle: 'Vehicle',
        vehicleModel: 'Vehicle Model',
        vehicleColor: 'Vehicle Color',
        licensePlate: 'License Plate',
        rating: 'Rating',
        ridesCompleted: 'Rides Completed',
        memberSince: 'Member since',
        verified: 'Verified',
        notVerified: 'Not verified',
        verifyNow: 'Verify now',
    },
    messages: {
        newMessage: 'New Message',
        sendMessage: 'Send Message',
        typeMessage: 'Type a message...',
        noMessages: 'No messages yet',
        startConversation: 'Start a conversation',
        messagesSent: 'Messages sent',
        messagesReceived: 'Messages received',
    },
    safety: {
        emergencyContacts: 'Emergency Contacts',
        addEmergencyContact: 'Add Emergency Contact',
        shareTrip: 'Share Trip',
        sos: 'SOS',
        sosActivated: 'SOS Activated',
        safetyFeatures: 'Safety Features',
        reportIssue: 'Report Issue',
        verifiedDriver: 'Verified Driver',
        verifiedPassenger: 'Verified Passenger',
    },
    rewards: {
        myRewards: 'My Rewards',
        points: 'Points',
        earnPoints: 'Earn Points',
        redeemRewards: 'Redeem Rewards',
        co2Saved: 'CO₂ Saved',
        treesEquivalent: 'Trees Equivalent',
        carbonFootprint: 'Carbon Footprint',
        environmentalImpact: 'Environmental Impact',
        leaderboard: 'Leaderboard',
        tier: 'Tier',
        nextTier: 'Next tier',
        pointsToNextTier: '{{count}} points to next tier',
    },
    premium: {
        premium: 'Premium',
        upgradeToPremium: 'Upgrade to Premium',
        currentPlan: 'Current Plan',
        freePlan: 'Free Plan',
        plusPlan: 'Plus Plan',
        proPlan: 'Pro Plan',
        monthlyBilling: 'Monthly billing',
        yearlyBilling: 'Yearly billing',
        savePercent: 'Save {{percent}}%',
        features: 'Features',
        cancelAnytime: 'Cancel anytime',
        startFreeTrial: 'Start free trial',
        trialDays: '{{days}}-day free trial',
    },
    notifications: {
        notifications: 'Notifications',
        markAllRead: 'Mark all as read',
        noNotifications: 'No notifications',
        rideReminder: 'Ride Reminder',
        newBooking: 'New Booking',
        messageReceived: 'Message Received',
        rideUpdate: 'Ride Update',
    },
    settings: {
        language: 'Language',
        notifications: 'Notifications',
        privacy: 'Privacy',
        security: 'Security',
        appearance: 'Appearance',
        darkMode: 'Dark Mode',
        pushNotifications: 'Push Notifications',
        emailNotifications: 'Email Notifications',
        changePassword: 'Change Password',
        deleteAccount: 'Delete Account',
        exportData: 'Export My Data',
    },
    errors: {
        networkError: 'Network error. Please check your connection.',
        serverError: 'Server error. Please try again later.',
        invalidEmail: 'Please enter a valid email address.',
        invalidPassword: 'Password must be at least 8 characters.',
        passwordMismatch: 'Passwords do not match.',
        fieldRequired: 'This field is required.',
        somethingWentWrong: 'Something went wrong. Please try again.',
    },
    time: {
        today: 'Today',
        tomorrow: 'Tomorrow',
        yesterday: 'Yesterday',
        thisWeek: 'This week',
        nextWeek: 'Next week',
        justNow: 'Just now',
        minutesAgo: '{{count}} minutes ago',
        hoursAgo: '{{count}} hours ago',
        daysAgo: '{{count}} days ago',
    },
};

// Spanish translations
translations.es = {
    common: {
        loading: 'Cargando...',
        error: 'Se produjo un error',
        save: 'Guardar',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        delete: 'Eliminar',
        edit: 'Editar',
        close: 'Cerrar',
        back: 'Atrás',
        next: 'Siguiente',
        submit: 'Enviar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        refresh: 'Actualizar',
        viewAll: 'Ver todo',
        showMore: 'Ver más',
        showLess: 'Ver menos',
        yes: 'Sí',
        no: 'No',
        or: 'o',
        and: 'y',
    },
    auth: {
        signIn: 'Iniciar Sesión',
        signUp: 'Registrarse',
        signOut: 'Cerrar Sesión',
        email: 'Correo electrónico',
        password: 'Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        forgotPassword: '¿Olvidaste tu contraseña?',
        resetPassword: 'Restablecer Contraseña',
        createAccount: 'Crear Cuenta',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
        dontHaveAccount: '¿No tienes una cuenta?',
        termsAgree: 'Acepto los Términos de Servicio y la Política de Privacidad',
    },
    navigation: {
        home: 'Inicio',
        rides: 'Viajes',
        messages: 'Mensajes',
        profile: 'Perfil',
        settings: 'Ajustes',
        help: 'Ayuda',
        about: 'Acerca de',
    },
    rides: {
        findRide: 'Buscar Viaje',
        offerRide: 'Ofrecer Viaje',
        myRides: 'Mis Viajes',
        upcomingRides: 'Próximos Viajes',
        pastRides: 'Viajes Pasados',
        from: 'Desde',
        to: 'Hasta',
        date: 'Fecha',
        time: 'Hora',
        seats: 'Asientos',
        seatsAvailable: '{{count}} asientos disponibles',
        price: 'Precio',
        freeRide: 'Gratis',
        fuelContribution: 'Contribución de Combustible',
        bookRide: 'Reservar Viaje',
        cancelRide: 'Cancelar Viaje',
        rideDetails: 'Detalles del Viaje',
        driver: 'Conductor',
        passengers: 'Pasajeros',
        noRidesFound: 'No se encontraron viajes',
        searchAgain: 'Intenta ajustar tus criterios de búsqueda',
        rideBooked: '¡Viaje reservado con éxito!',
        rideCancelled: 'Viaje cancelado',
        recurring: 'Viaje recurrente',
        oneTime: 'Viaje único',
    },
    profile: {
        editProfile: 'Editar Perfil',
        myProfile: 'Mi Perfil',
        fullName: 'Nombre Completo',
        phoneNumber: 'Número de Teléfono',
        bio: 'Biografía',
        vehicle: 'Vehículo',
        vehicleModel: 'Modelo del Vehículo',
        vehicleColor: 'Color del Vehículo',
        licensePlate: 'Matrícula',
        rating: 'Calificación',
        ridesCompleted: 'Viajes Completados',
        memberSince: 'Miembro desde',
        verified: 'Verificado',
        notVerified: 'No verificado',
        verifyNow: 'Verificar ahora',
    },
    rewards: {
        myRewards: 'Mis Recompensas',
        points: 'Puntos',
        earnPoints: 'Ganar Puntos',
        redeemRewards: 'Canjear Recompensas',
        co2Saved: 'CO₂ Ahorrado',
        treesEquivalent: 'Equivalente en Árboles',
        carbonFootprint: 'Huella de Carbono',
        environmentalImpact: 'Impacto Ambiental',
        leaderboard: 'Clasificación',
        tier: 'Nivel',
        nextTier: 'Siguiente nivel',
        pointsToNextTier: '{{count}} puntos para el siguiente nivel',
    },
    settings: {
        language: 'Idioma',
        notifications: 'Notificaciones',
        privacy: 'Privacidad',
        security: 'Seguridad',
        appearance: 'Apariencia',
        darkMode: 'Modo Oscuro',
        pushNotifications: 'Notificaciones Push',
        emailNotifications: 'Notificaciones por Email',
        changePassword: 'Cambiar Contraseña',
        deleteAccount: 'Eliminar Cuenta',
        exportData: 'Exportar Mis Datos',
    },
    errors: {
        networkError: 'Error de red. Por favor verifica tu conexión.',
        serverError: 'Error del servidor. Por favor intenta de nuevo más tarde.',
        invalidEmail: 'Por favor ingresa un correo electrónico válido.',
        invalidPassword: 'La contraseña debe tener al menos 8 caracteres.',
        passwordMismatch: 'Las contraseñas no coinciden.',
        fieldRequired: 'Este campo es obligatorio.',
        somethingWentWrong: 'Algo salió mal. Por favor intenta de nuevo.',
    },
};

// French translations
translations.fr = {
    common: {
        loading: 'Chargement...',
        error: 'Une erreur est survenue',
        save: 'Enregistrer',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        delete: 'Supprimer',
        edit: 'Modifier',
        close: 'Fermer',
        back: 'Retour',
        next: 'Suivant',
        submit: 'Soumettre',
        search: 'Rechercher',
        filter: 'Filtrer',
        sort: 'Trier',
        refresh: 'Actualiser',
        viewAll: 'Voir tout',
        showMore: 'Voir plus',
        showLess: 'Voir moins',
        yes: 'Oui',
        no: 'Non',
        or: 'ou',
        and: 'et',
    },
    auth: {
        signIn: 'Connexion',
        signUp: 'Inscription',
        signOut: 'Déconnexion',
        email: 'Email',
        password: 'Mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        forgotPassword: 'Mot de passe oublié ?',
        resetPassword: 'Réinitialiser le mot de passe',
        createAccount: 'Créer un compte',
        alreadyHaveAccount: 'Vous avez déjà un compte ?',
        dontHaveAccount: "Vous n'avez pas de compte ?",
        termsAgree: "J'accepte les Conditions d'utilisation et la Politique de confidentialité",
    },
    navigation: {
        home: 'Accueil',
        rides: 'Trajets',
        messages: 'Messages',
        profile: 'Profil',
        settings: 'Paramètres',
        help: 'Aide',
        about: 'À propos',
    },
    rides: {
        findRide: 'Trouver un trajet',
        offerRide: 'Proposer un trajet',
        myRides: 'Mes trajets',
        upcomingRides: 'Trajets à venir',
        pastRides: 'Trajets passés',
        from: 'De',
        to: 'À',
        date: 'Date',
        time: 'Heure',
        seats: 'Places',
        seatsAvailable: '{{count}} places disponibles',
        price: 'Prix',
        freeRide: 'Gratuit',
        fuelContribution: 'Participation aux frais',
        bookRide: 'Réserver',
        cancelRide: 'Annuler le trajet',
        rideDetails: 'Détails du trajet',
        driver: 'Conducteur',
        passengers: 'Passagers',
        noRidesFound: 'Aucun trajet trouvé',
        searchAgain: 'Essayez de modifier vos critères de recherche',
        rideBooked: 'Trajet réservé avec succès !',
        rideCancelled: 'Trajet annulé',
        recurring: 'Trajet récurrent',
        oneTime: 'Trajet ponctuel',
    },
    settings: {
        language: 'Langue',
        notifications: 'Notifications',
        privacy: 'Confidentialité',
        security: 'Sécurité',
        appearance: 'Apparence',
        darkMode: 'Mode sombre',
        pushNotifications: 'Notifications push',
        emailNotifications: 'Notifications par email',
        changePassword: 'Changer le mot de passe',
        deleteAccount: 'Supprimer le compte',
        exportData: 'Exporter mes données',
    },
};

// German translations
translations.de = {
    common: {
        loading: 'Laden...',
        error: 'Ein Fehler ist aufgetreten',
        save: 'Speichern',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        close: 'Schließen',
        back: 'Zurück',
        next: 'Weiter',
        submit: 'Absenden',
        search: 'Suchen',
        filter: 'Filtern',
        sort: 'Sortieren',
        refresh: 'Aktualisieren',
        viewAll: 'Alle anzeigen',
        showMore: 'Mehr anzeigen',
        showLess: 'Weniger anzeigen',
        yes: 'Ja',
        no: 'Nein',
        or: 'oder',
        and: 'und',
    },
    auth: {
        signIn: 'Anmelden',
        signUp: 'Registrieren',
        signOut: 'Abmelden',
        email: 'E-Mail',
        password: 'Passwort',
        confirmPassword: 'Passwort bestätigen',
        forgotPassword: 'Passwort vergessen?',
        resetPassword: 'Passwort zurücksetzen',
        createAccount: 'Konto erstellen',
        alreadyHaveAccount: 'Bereits ein Konto?',
        dontHaveAccount: 'Noch kein Konto?',
        termsAgree: 'Ich akzeptiere die Nutzungsbedingungen und Datenschutzrichtlinie',
    },
    navigation: {
        home: 'Startseite',
        rides: 'Fahrten',
        messages: 'Nachrichten',
        profile: 'Profil',
        settings: 'Einstellungen',
        help: 'Hilfe',
        about: 'Über uns',
    },
    rides: {
        findRide: 'Fahrt finden',
        offerRide: 'Fahrt anbieten',
        myRides: 'Meine Fahrten',
        upcomingRides: 'Kommende Fahrten',
        pastRides: 'Vergangene Fahrten',
        from: 'Von',
        to: 'Nach',
        date: 'Datum',
        time: 'Uhrzeit',
        seats: 'Plätze',
        seatsAvailable: '{{count}} Plätze verfügbar',
        price: 'Preis',
        freeRide: 'Kostenlos',
        fuelContribution: 'Spritbeteiligung',
        bookRide: 'Fahrt buchen',
        cancelRide: 'Fahrt stornieren',
        rideDetails: 'Fahrtdetails',
        driver: 'Fahrer',
        passengers: 'Mitfahrer',
        noRidesFound: 'Keine Fahrten gefunden',
        searchAgain: 'Versuchen Sie, Ihre Suchkriterien anzupassen',
        rideBooked: 'Fahrt erfolgreich gebucht!',
        rideCancelled: 'Fahrt storniert',
        recurring: 'Regelmäßige Fahrt',
        oneTime: 'Einmalige Fahrt',
    },
    settings: {
        language: 'Sprache',
        notifications: 'Benachrichtigungen',
        privacy: 'Datenschutz',
        security: 'Sicherheit',
        appearance: 'Erscheinungsbild',
        darkMode: 'Dunkelmodus',
        pushNotifications: 'Push-Benachrichtigungen',
        emailNotifications: 'E-Mail-Benachrichtigungen',
        changePassword: 'Passwort ändern',
        deleteAccount: 'Konto löschen',
        exportData: 'Meine Daten exportieren',
    },
};

// Track already-warned missing translation keys (dev only)
const warnedKeys = new Set<string>();

// Helper to get nested translation
function getNestedValue(obj: any, path: string): string | undefined {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Provider component
interface I18nProviderProps {
    children: ReactNode;
    defaultLanguage?: SupportedLanguage;
}

export function I18nProvider({ children, defaultLanguage = 'en' }: I18nProviderProps) {
    const [language, setLanguageState] = useState<SupportedLanguage>(() => {
        // Try to get from localStorage or browser
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('language') as SupportedLanguage;
            if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
                return stored;
            }
            // Try browser language
            const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
            if (SUPPORTED_LANGUAGES.some((l) => l.code === browserLang)) {
                return browserLang;
            }
        }
        return defaultLanguage;
    });
    const setLanguage = useCallback((lang: SupportedLanguage) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
    }, []);

    // Translation function
    const t = useCallback(
        (key: TranslationKey, params?: Record<string, string | number>): string => {
            let translation = getNestedValue(translations[language], key);

            // Fallback to English
            if (!translation) {
                translation = getNestedValue(translations.en, key);
            }

            // Return key if not found
            if (!translation) {
                if (import.meta.env.DEV && !warnedKeys.has(key)) {
                    warnedKeys.add(key);
                    console.warn(`Translation missing: ${key}`);
                }
                return key;
            }

            // Replace parameters
            if (params) {
                Object.entries(params).forEach(([paramKey, value]) => {
                    translation = translation!.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
                });
            }

            return translation;
        },
        [language]
    );

    // Date formatting
    const formatDate = useCallback(
        (date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string => {
            const d = typeof date === 'string' ? new Date(date) : date;
            const locale = language === 'en' ? 'en-GB' : language;

            if (format === 'relative') {
                const now = new Date();
                const diff = now.getTime() - d.getTime();
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);

                if (minutes < 1) return t('time.justNow');
                if (minutes < 60) return t('time.minutesAgo', { count: minutes });
                if (hours < 24) return t('time.hoursAgo', { count: hours });
                if (days < 7) return t('time.daysAgo', { count: days });
            }

            const options: Intl.DateTimeFormatOptions =
                format === 'long'
                    ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                    : { year: 'numeric', month: 'short', day: 'numeric' };

            return new Intl.DateTimeFormat(locale, options).format(d);
        },
        [language, t]
    );

    // Number formatting
    const formatNumber = useCallback(
        (num: number, options?: Intl.NumberFormatOptions): string => {
            const locale = language === 'en' ? 'en-GB' : language;
            return new Intl.NumberFormat(locale, options).format(num);
        },
        [language]
    );

    // Currency formatting
    const formatCurrency = useCallback(
        (amount: number, currency: string = 'GBP'): string => {
            const locale = language === 'en' ? 'en-GB' : language;
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
            }).format(amount);
        },
        [language]
    );

    const languageInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language)!;

    const value: I18nContextValue = {
        language,
        setLanguage,
        t,
        formatDate,
        formatNumber,
        formatCurrency,
        languageInfo,
        isLoading: false,
    };

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Hook to use i18n
export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

// Hook for just translation function (convenience)
export function useTranslation() {
    const { t, language } = useI18n();
    return { t, language };
}
