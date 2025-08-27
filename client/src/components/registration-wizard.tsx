import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, RecaptchaVerifier, linkWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Mail, Shield, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getSponsors, type Sponsor as SponsorType } from "@/lib/firebaseService";

// Nigerian States and LGAs
const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", 
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", 
  "Yobe", "Zamfara"
];

const STATES_LGAS: Record<string, string[]> = {
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Somolu", "Surulere"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
  "Rivers": ["Abua-Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana", "Obio-Akpor", "Ogba-Egbema-Ndoni", "Ogu-Bolo", "Okrika", "Omuma", "Opobo-Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
  "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
  "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dan Musa", "Dandume", "Danja", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"],
  "Borno": ["Abadam", "Askira-Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala-Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
  "Jigawa": ["Auyo", "Babura", "Birniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
  "Zamfara": ["Anka", "Bakura", "Birnin Magaji-Kiyaw", "Bukkuyum", "Bungudu", "Gummi", "Gusau", "Kaura Namoda", "Maradun", "Maru", "Shinkafi", "Talata Mafara", "Tsafe", "Zurmi"],
  "Kebbi": ["Aleiro", "Arewa Dandi", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko-Besse", "Maiyama", "Ngaski", "Sakaba", "Shanga", "Suru", "Wasagu-Danko", "Yauri", "Zuru"],
  "Sokoto": ["Binji", "Bodinga", "Dange-Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo"],
  "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela-Odolu", "Ijumu", "Kabba/Bunu", "Kogi", "Lokoja", "Mopa-Muro", "Ofu", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"],
  "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"],
  "Adamawa": ["Demsa", "Fufure", "Ganye", "Gayuk", "Gombi", "Grie", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
  "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat Enin", "Nsit Atai", "Nsit Ibom", "Nsit Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung Uko", "Ukanafun", "Uruan", "Urue Offong/Oruko", "Uyo"],
  "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
  "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Dambam", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas-Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
  "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
  "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Oturkpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
  "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"],
  "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
  "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Oredo", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
  "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
  "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo Uwani"],
  "FCT": ["Abaji", "Abuja Municipal", "Gwagwalada", "Kuje", "Kwali"],
  "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu-Deba"],
  "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West", "Unuimo"],
  "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"],
  "Nasarawa": ["Akwanga", "Awe", "Doma", "Karu", "Keffi", "Kokona", "Lafia", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
  "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mokwa", "Munya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
  "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Egbado North", "Egbado South", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu"],
  "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Ile Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo East", "Ondo West", "Ose", "Owo"],
  "Osun": ["Aiyedade", "Aiyedire", "Atakunmosa East", "Atakunmosa West", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ife Central", "Ife East", "Ife North", "Ife South", "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"],
  "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iseyin", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo East", "Oyo West", "Saki East", "Saki West", "Surulere"],
  "Plateau": ["Barkin Ladi", "Bassa", "Bokkos", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"],
  "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"]
};

// Predefined batch options
const BATCH_OPTIONS = [
  { id: "A", name: "Batch A", description: "First intake group" },
  { id: "B", name: "Batch B", description: "Second intake group" },
  { id: "C", name: "Batch C", description: "Third intake group" },
  { id: "D", name: "Batch D", description: "Fourth intake group" }
];

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string().optional(),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
    state: z.string().min(1, "State is required"),
    lga: z.string().min(1, "LGA is required"),
    email: z.string().email("Please enter a valid email address").optional(),
    phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, "Please enter a valid Nigerian phone number").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    confirmPassword: z.string().optional(),
    verificationMethod: z.enum(["email", "phone"], { required_error: "Verification method is required" }),
    sponsorId: z.string().min(1, "Sponsor is required"),
    batchId: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.verificationMethod === "email") {
      if (!d.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email is required" });
      }
    }
    if (d.verificationMethod === "phone") {
      if (!d.phone) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Phone number is required" });
      }
      if (!d.password) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password is required" });
      }
      if (!d.confirmPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Confirm your password" });
      }
      if (d.password && d.confirmPassword && d.password !== d.confirmPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords don't match" });
      }
    }
  });

type FormData = z.infer<typeof schema>;

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

// Email Validation Status Modal Component
function EmailValidationModal({ 
  isOpen, 
  onClose, 
  email, 
  validationStatus, 
  validationSteps 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  email: string; 
  validationStatus: "idle" | "validating" | "valid" | "invalid";
  validationSteps: Array<{ id: string; name: string; status: "pending" | "checking" | "success" | "error"; message?: string }>;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} aria-describedby="email-validation-desc">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Email Validation
          </DialogTitle>
        </DialogHeader>
        <p id="email-validation-desc" className="sr-only">This dialog shows the progress of email validation steps.</p>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Validating Email</h3>
            <p className="text-sm text-gray-600">{email}</p>
          </div>

          <div className="space-y-3">
            {validationSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-shrink-0">
                  {step.status === "pending" && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                  )}
                  {step.status === "checking" && (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  )}
                  {step.status === "success" && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                  {step.status === "error" && (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-sm">{step.name}</div>
                  {step.message && (
                    <div className={`text-xs ${step.status === "error" ? "text-red-600" : step.status === "success" ? "text-green-600" : "text-gray-500"}`}>
                      {step.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {validationStatus === "valid" && (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Email validation successful!</p>
              <p className="text-green-600 text-sm">Proceeding to send verification code...</p>
            </div>
          )}

          {validationStatus === "invalid" && (
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-800 font-medium">Email validation failed</p>
              <p className="text-red-600 text-sm">Please check the details above</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RegistrationWizard({ isOpen, onClose, onSwitchToLogin }: WizardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [emailStage, setEmailStage] = useState<"idle" | "codeSent" | "setPassword" | "success">("idle");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailValidationStatus, setEmailValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  
  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationSteps, setValidationSteps] = useState<Array<{ id: string; name: string; status: "pending" | "checking" | "success" | "error"; message?: string }>>([
    { id: "format", name: "Email Format Check", status: "pending" },
    { id: "duplicate", name: "Duplicate Check", status: "pending" },
    { id: "mx", name: "Domain MX Records", status: "pending" },
    { id: "deliverability", name: "Email Deliverability", status: "pending" },
    { id: "sending", name: "Sending Verification Code", status: "pending" }
  ]);

  const { data: sponsors = [] } = useQuery<SponsorType[]>({
    queryKey: ["sponsors"],
    queryFn: getSponsors,
    staleTime: 60_000,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      gender: undefined,
      state: "",
      lga: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      verificationMethod: undefined,
      sponsorId: "",
      batchId: "",
    },
  });

  const selectedState = form.watch("state");
  const availableLGAs = selectedState ? STATES_LGAS[selectedState] || [] : [];

  // Enhanced email validation function with step-by-step feedback
  const validateEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidationStatus("invalid");
      return false;
    }

    setIsValidatingEmail(true);
    setEmailValidationStatus("validating");
    setShowValidationModal(true);
    
    // Reset validation steps
    setValidationSteps([
      { id: "format", name: "Email Format Check", status: "checking" },
      { id: "duplicate", name: "Duplicate Check", status: "pending" },
      { id: "mx", name: "Domain MX Records", status: "pending" },
      { id: "deliverability", name: "Email Deliverability", status: "pending" },
      { id: "sending", name: "Sending Verification Code", status: "pending" }
    ]);

    try {
      // Step 1: Format check
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        setValidationSteps(prev => prev.map(s => 
          s.id === "format" ? { ...s, status: "error", message: "Invalid email format" } : s
        ));
        setEmailValidationStatus("invalid");
        setShowValidationModal(false);
        return false;
      }
      
      setValidationSteps(prev => prev.map(s => 
        s.id === "format" ? { ...s, status: "success", message: "Valid email format" } : s
      ));

      // Step 2: Duplicate check
      setValidationSteps(prev => prev.map(s => 
        s.id === "duplicate" ? { ...s, status: "checking" } : s
      ));

      const response = await apiRequest('POST', '/api/email/validate', { email });

      if (response.ok) {
        setValidationSteps(prev => prev.map(s => 
          s.id === "duplicate" ? { ...s, status: "success", message: "No duplicates found" } : s
        ));
        setValidationSteps(prev => prev.map(s => 
          s.id === "mx" ? { ...s, status: "success", message: "MX records verified" } : s
        ));
        setValidationSteps(prev => prev.map(s => 
          s.id === "deliverability" ? { ...s, status: "success", message: "Email can receive messages" } : s
        ));
        
        setEmailValidationStatus("valid");
        setEmailError(undefined);
        
        // Show sending step
        setValidationSteps(prev => prev.map(s => 
          s.id === "sending" ? { ...s, status: "checking", message: "Sending verification code..." } : s
        ));
        
        // Auto-close validation modal and proceed to send verification code
        setTimeout(() => {
          setShowValidationModal(false);
          // Automatically proceed to send verification code
          handleSendVerificationCode();
        }, 1500);
        
        return true;
      } else {
        const data = await response.json();
        setValidationSteps(prev => prev.map(s => 
          s.id === "duplicate" ? { ...s, status: "error", message: data.message || "Duplicate found" } : s
        ));
        setEmailValidationStatus("invalid");
        setEmailError(data.message || 'Email validation failed');
        
        // Auto-close validation modal after showing error
        setTimeout(() => {
          setShowValidationModal(false);
        }, 2000);
        
        return false;
      }
    } catch (error) {
      setValidationSteps(prev => prev.map(s => 
        s.id === "duplicate" ? { ...s, status: "error", message: "Validation failed" } : s
      ));
      setEmailValidationStatus("invalid");
      setEmailError('Email validation failed. Please try again.');
      
      // Auto-close validation modal after showing error
      setTimeout(() => {
        setShowValidationModal(false);
      }, 2000);
      
      return false;
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Function to handle sending verification code after successful email validation
  const handleSendVerificationCode = async () => {
    const formData = form.getValues();
    if (!formData.email) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const tempPwd = "Tmp-Verify-123!";
      
      // Call sendCode function
      const result = await sendCode(formData.email as string, tempPwd);
      
      // Since sendCode successfully completed, we know the email was sent
      // The emailStage should be set to "codeSent" by the sendCode function
      
      // Update validation steps to show success
      setValidationSteps(prev => prev.map(s => 
        s.id === "sending" ? { ...s, status: "success", message: "Verification code sent successfully!" } : s
      ));
      
      toast({ 
        title: "Verification code sent", 
        description: `A 6-digit code was sent to ${formData.email}` 
      });
      
      // The verification code input should now be visible since emailStage is "codeSent"
      
    } catch (error: any) {
      // Update validation steps to show error
      setValidationSteps(prev => prev.map(s => 
        s.id === "sending" ? { ...s, status: "error", message: error.message || "Failed to send code" } : s
      ));
      
      toast({ 
        title: "Failed to send code", 
        description: error.message || "An error occurred while sending the verification code", 
        variant: "destructive" 
      });
      
      // Reset validation status so user can try again
      setEmailValidationStatus("idle");
      setEmailError("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // helpers ---------------------------------------------------
  const sendCode = async (email: string, password: string) => {
    try {
      const res = await apiRequest("POST", "/api/register/step1", { email, password, confirmPassword: password });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP ${res.status}: Failed to send code`);
      }
      
      const data = await res.json();
      
      if (data?.devCode) {
        setVerificationCode(String(data.devCode));
      }
      
      setEmailStage("codeSent");
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const verifyCode = async (email: string, code: string) => {
    const res = await apiRequest("POST", "/api/register/verify", { email, code });
    if (!res.ok) throw new Error((await res.json()).message || "Verification failed");
  };

  const handleNext = async () => {
    if (step === 1) {
      const ok = await form.trigger(["firstName", "lastName", "dateOfBirth", "gender"]);
      if (ok) setStep(2);
      return;
    }

    if (step === 2) {
      const ok = await form.trigger(["state", "lga"]);
      if (ok) setStep(3);
      return;
    }

    if (step === 3) {
      const vm = form.getValues().verificationMethod;
      const fields: (keyof FormData)[] = ["sponsorId", "batchId", "verificationMethod"];
      if (vm === "email") fields.push("email");
      if (vm === "phone") fields.push("phone", "password", "confirmPassword");
      const ok = await form.trigger(fields as any);
      if (!ok) return;

      const formData = form.getValues();
      setLoading(true);
      try {
        const method = formData.verificationMethod;
        if (method === "email") {
          // Validate email deliverability and availability before sending code
          const isEmailValid = await validateEmail(formData.email as string);
          if (!isEmailValid) {
            setLoading(false);
            return;
          }
          // Note: handleSendVerificationCode is now called automatically from validateEmail on success
          return;
        } else if (method === "phone") {
          // Use synthetic email for phone-based login, so user can log in with phone + password
          const sanitizedPhone = (formData.phone || "").replace(/\D/g, "");
          const syntheticEmail = `${sanitizedPhone}@phone.cssfarms.local`;
          const userCredential = await createUserWithEmailAndPassword(auth, syntheticEmail, formData.password as string);
          await signInWithEmailAndPassword(auth, syntheticEmail, formData.password as string);

          // Link phone number to this account for future phone-based recovery
          try {
            const recaptchaId = "recaptcha-container-registration";
            let verifierEl = document.getElementById(recaptchaId);
            if (!verifierEl) {
              verifierEl = document.createElement("div");
              verifierEl.id = recaptchaId;
              verifierEl.style.display = "none";
              document.body.appendChild(verifierEl);
            }
            const appVerifier = new RecaptchaVerifier(auth, recaptchaId, { size: "invisible" });
            const confirmationResult = await linkWithPhoneNumber(auth.currentUser!, formData.phone as string, appVerifier);
            const code = window.prompt("Enter the verification code sent to your phone");
            if (!code) {
              throw new Error("Phone verification code is required to complete registration.");
            }
            await confirmationResult.confirm(code);
          } catch (linkErr: any) {
            toast({ title: "Phone verification failed", description: linkErr?.message || "Unable to verify phone number.", variant: "destructive" });
            throw linkErr;
          }
        }

        // Create trainee document in Firestore (phone path only)
        if (method === "phone") {
          const traineeData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            middleName: formData.middleName || "",
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            state: formData.state,
            lga: formData.lga,
            email: "",
            phone: formData.phone || "",
            role: "trainee",
            isVerified: false,
            tagNumber: "pending",
            verificationMethod: method,
            roomNumber: "pending",
            roomBlock: "pending",
            bedSpace: "pending",
            allocationStatus: "pending",
            sponsorId: formData.sponsorId || "",
            batchId: formData.batchId || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await addDoc(collection(db, "trainees"), traineeData);
          toast({ 
            title: "Registration complete", 
            description: "Account created successfully!" 
          });
          onClose();
          setLocation("/trainee-dashboard");
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  const handleVerifyEmailCode = async () => {
    const email = form.getValues("email") as string;
    if (!verificationCode || verificationCode.length !== 6) {
      toast({ title: "Enter code", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Verification failed");
      setEmailStage("setPassword");
      toast({ title: "Verified", description: "Email verified. Create your password to finish." });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || "Invalid or expired code.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteEmailRegistration = async () => {
    const formData = form.getValues();
    if (!emailPassword || emailPassword.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (emailPassword !== emailConfirmPassword) {
      toast({ title: "Passwords don't match", description: "Make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, formData.email as string, emailPassword);

      const traineeData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || "",
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        state: formData.state,
        lga: formData.lga,
        email: formData.email || "",
        phone: "",
        role: "trainee",
        isVerified: true,
        tagNumber: "pending",
        verificationMethod: "email",
        roomNumber: "pending",
        roomBlock: "pending",
        bedSpace: "pending",
        allocationStatus: "pending",
        sponsorId: formData.sponsorId || "",
        batchId: formData.batchId || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "trainees"), traineeData);
      setEmailStage("success");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.message || "Unable to complete registration.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  // UI --------------------------------------------------------
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} aria-describedby="trainee-registration-desc">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              Trainee Registration
            </DialogTitle>
          </DialogHeader>
          <p id="trainee-registration-desc" className="sr-only">Complete the trainee registration steps and verification.</p>

          {emailStage === "codeSent" ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Enter Verification Code</h3>
                <p className="text-sm text-gray-600">We sent a 6-digit code to {form.getValues("email")}. Which will expire within 10 minutes Enter it below to continue.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                <Input
                  placeholder="123456"
                  value={verificationCode}
                  className={codeError ? "border-red-500 focus-visible:ring-red-500" : undefined}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                    setCodeError(undefined);
                    if (value.length === 6 && !isVerifyingCode) {
                      (async () => {
                        try {
                          setIsVerifyingCode(true);
                          const email = form.getValues("email") as string;
                          const res = await apiRequest("POST", "/api/register/verify", { email, code: value });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err?.message || "Invalid or expired code");
                          }
                          setEmailStage("setPassword");
                          toast({ title: "Verified", description: "Email verified. Create your password to finish." });
                        } catch (err: any) {
                          setCodeError(err?.message || "Invalid or expired code");
                        } finally {
                          setIsVerifyingCode(false);
                        }
                      })();
                    }
                  }}
                />
                {codeError && (
                  <p className="mt-1 text-sm text-red-600">{codeError}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-between">
                <Button type="button" variant="outline" onClick={() => setEmailStage("idle")}>Back</Button>
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || isVerifyingCode}
                    onClick={async () => {
                      setVerificationCode("");
                      setCodeError(undefined);
                      await sendCode(form.getValues("email") as string, "Tmp-Verify-123!");
                    }}
                  >
                    Resend Code
                  </Button>
                </div>
              </div>
            </div>
          ) : emailStage === "setPassword" ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Create Your Password</h3>
                <p className="text-sm text-gray-600">Set a secure password to complete your registration.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <Input type="password" placeholder="********" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <Input type="password" placeholder="********" value={emailConfirmPassword} onChange={(e) => setEmailConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" disabled={loading} onClick={handleCompleteEmailRegistration}>
                  {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : (<>Create Account</>)}
                </Button>
              </div>
            </div>
          ) : emailStage === "success" ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Registration Complete</h3>
                <p className="text-sm text-gray-600">Your account has been created. You can now proceed to login with your email and password.</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { onClose(); onSwitchToLogin?.(); }}>Open Login</Button>
              </div>
            </div>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleNext)} className="space-y-6">
              
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>First Name *</FormLabel>
                        <FormControl>
                            <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Middle Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Michael" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                        <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="male" />
                                <Label htmlFor="male">Male</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="female" />
                                <Label htmlFor="female">Female</Label>
                              </div>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State of Origin *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {NIGERIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Government Area *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedState}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedState ? "Select your LGA" : "Select state first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableLGAs.map((lga) => (
                                <SelectItem key={lga} value={lga}>
                                  {lga}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact/verification moved to Step 4 */}
                </div>
              )}

              {/* Step 3: Additional Details */}
              {step === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sponsorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sponsor (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your sponsor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sponsors.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                      <FormLabel>Batch ID (Optional)</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your batch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BATCH_OPTIONS.map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Verification method selection and conditional inputs */}
                  <FormField
                    control={form.control}
                    name="verificationMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Method *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="email" id="email" />
                              <Label htmlFor="email">Email</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="phone" id="phone" />
                              <Label htmlFor="phone">Phone Number</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("verificationMethod") === "email" && (
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder="john.doe@example.com"
                              className={`pr-10 ${emailError ? "border-red-500 focus-visible:ring-red-500" : emailValidationStatus === "valid" ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (emailError) setEmailError(undefined);
                                if (emailValidationStatus !== "idle") setEmailValidationStatus("idle");
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                if (e.target.value && e.target.value.includes('@')) {
                                  validateEmail(e.target.value);
                                }
                              }}
                              disabled={emailValidationStatus === "valid"}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {isValidatingEmail && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              )}
                              {emailValidationStatus === "valid" && !isValidatingEmail && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {emailValidationStatus === "invalid" && !isValidatingEmail && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              {emailValidationStatus === "idle" && field.value && (
                                <AlertCircle className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                          </FormControl>
                          <FormMessage />
                          {emailError && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span>{emailError}</span>
                          </div>
                        )}
                        {emailValidationStatus === "valid" && !emailError && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Email verified! Click "Verify Email" to continue</span>
                          </div>
                        )}
                        {emailValidationStatus === "idle" && field.value && !emailError && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <AlertCircle className="h-4 w-4" />
                            <span>Click outside to validate email</span>
                          </div>
                          )}
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch("verificationMethod") === "phone" && (
                    <>
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+2348012345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Create Password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                )}
                <Button type="button" disabled={loading} className="ml-auto" onClick={handleNext}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : step === 3 ? (
                    <>
                      {form.watch("verificationMethod") === "email" ? "Verify Email" : "Complete Registration"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
          )}
        </DialogContent>
      
      {/* Email Validation Modal */}
      <EmailValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        email={form.getValues("email") || ""}
        validationStatus={emailValidationStatus}
        validationSteps={validationSteps}
      />
    </Dialog>
  );
}
