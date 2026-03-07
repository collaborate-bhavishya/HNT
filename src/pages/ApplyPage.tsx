import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { cn } from '../lib/utils';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

const subjects = ['Math', 'English', 'Science', 'Coding', 'Financial Literacy', 'Robotics'] as const;

const applySchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    city: z.string().min(2, 'City is required'),

    highestEducation: z.string().min(2, 'Highest education is required'),
    subject: z.enum(['Math', 'English', 'Science', 'Coding', 'Financial Literacy', 'Robotics']),

    priorExperience: z.boolean(),
    yearsOfExperience: z.number().min(0, 'Must be at least 0').optional().or(z.nan()),
    companyName: z.string().optional(),

    currentlyWorking: z.boolean(),
    workType: z.enum(['full-time', 'part-time']).optional(),

    available120Hours: z.boolean(),
    openToWeekends: z.boolean(),
    comfortableNightShifts: z.boolean(),

    whyTeachWithUs: z.string().min(10, 'Please provide a short answer (min 10 characters)'),
    cvFile: z.any().optional(), // In a real app, handle File object. For now we just check if it exists or use controlled input.
}).superRefine((data, ctx) => {
    if (data.priorExperience) {
        if (data.yearsOfExperience === undefined || Number.isNaN(data.yearsOfExperience) || data.yearsOfExperience < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please provide valid years of experience',
                path: ['yearsOfExperience'],
            });
        }
        if (!data.companyName || data.companyName.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Company name is required',
                path: ['companyName'],
            });
        }
    }
    if (data.currentlyWorking) {
        if (!data.workType) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please select work type',
                path: ['workType'],
            });
        }
    }
});

type ApplyFormValues = z.infer<typeof applySchema>;

const steps = [
    { id: 'personal', title: 'Personal Details' },
    { id: 'education', title: 'Education & Subject' },
    { id: 'experience', title: 'Experience' },
    { id: 'availability', title: 'Availability' },
    { id: 'final', title: 'Final Step' },
];

export default function ApplyPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [assessmentToken, setAssessmentToken] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(5);

    const {
        register,
        handleSubmit,

        watch,
        trigger,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<ApplyFormValues>({
        resolver: zodResolver(applySchema),
        defaultValues: {
            priorExperience: false,
            currentlyWorking: false,
            available120Hours: false,
            openToWeekends: false,
            comfortableNightShifts: false,
        },
        mode: 'onTouched',
    });

    const priorExperience = watch('priorExperience');
    const currentlyWorking = watch('currentlyWorking');
    const cvFile = watch('cvFile');

    const fieldsByStep = [
        ['fullName', 'email', 'phone', 'city'],
        ['highestEducation', 'subject'],
        ['priorExperience', 'yearsOfExperience', 'companyName'],
        ['currentlyWorking', 'workType', 'available120Hours', 'openToWeekends', 'comfortableNightShifts'],
        ['whyTeachWithUs', 'cvFile']
    ];

    const next = async () => {
        const fields = fieldsByStep[currentStep] as (keyof ApplyFormValues)[];
        const output = await trigger(fields, { shouldFocus: true });

        if (!output) return;

        if (currentStep < steps.length - 1) {
            setCurrentStep(step => step + 1);
        }
    };

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(step => step - 1);
        }
    };

    const onSubmit = async (data: ApplyFormValues) => {
        const nameParts = data.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Doe';

        const experience = data.priorExperience && data.yearsOfExperience ? data.yearsOfExperience : 0;

        const motivationDetails = `
Why teach with us: ${data.whyTeachWithUs}
Highest Education: ${data.highestEducation}
Prior Experience: ${data.priorExperience ? `Yes, ${experience} years at ${data.companyName}` : 'No'}
Currently Working: ${data.currentlyWorking ? `Yes, ${data.workType} ` : 'No'}
Availability: 120hrs/mo (${data.available120Hours ? 'Yes' : 'No'}), Weekends (${data.openToWeekends ? 'Yes' : 'No'}), Night Shifts (${data.comfortableNightShifts ? 'Yes' : 'No'})
        `.trim();

        // Build Multipart Form Data (matching backend API contract)
        const formData = new FormData();
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('email', data.email);
        formData.append('phone', data.phone);
        formData.append('position', data.subject);
        formData.append('experience', String(experience));
        formData.append('currentLocation', data.city);
        formData.append('motivation', motivationDetails);

        // Append the file if it exists
        if (data.cvFile && data.cvFile.length > 0) {
            formData.append('cv', data.cvFile[0]);
        }

        console.log("Submitting FormData to /api/applications");

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_URL}/api/applications`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                console.error("Application Failed:", result);
                let errorMessage = 'Network error submitting application';
                if (result.message && Array.isArray(result.message)) {
                    errorMessage = result.message.join(', ');
                } else if (result.message) {
                    errorMessage = result.message;
                }
                alert(`Error: ${errorMessage}`);
                return;
            }

            setAssessmentToken(result.assessmentToken);
            setIsSubmitted(true);
        } catch (error) {
            console.error(error);
            alert("Network error submitting application");
        }
    };

    useEffect(() => {
        let timer: any;
        if (isSubmitted && countdown > 0) {
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [isSubmitted, countdown]);

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-8 space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold text-gray-900">Application Submitted!</CardTitle>
                        <CardDescription className="text-base text-gray-600">
                            Thank you for your interest. We have received your profile and are currently processing it.
                        </CardDescription>
                    </div>

                    <div className="py-4 border-y border-gray-100">
                        {countdown > 0 ? (
                            <p className="text-sm font-medium text-gray-500">
                                Finalizing your status in <span className="text-primary-600 font-bold text-lg">{countdown}</span> seconds...
                            </p>
                        ) : assessmentToken ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                                    <p className="text-primary-800 font-semibold mb-3">Great news! You've been shortlisted for the next round.</p>
                                    <Link to={`/assessment/${assessmentToken}`}>
                                        <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200">
                                            Proceed to Technical Assessment
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-700">
                                <p className="text-gray-700 font-medium">Thank you for applying. We are currently reviewing your profile.</p>
                                <p className="text-sm text-gray-500">Please check your email for further updates. Sometimes our emails may land in the SPAM folder, so kindly check your SPAM as well.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12">
            <div className="w-full max-w-2xl mb-8">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Join Our Teaching Team</h1>
                <p className="text-center text-gray-600">Empower students worldwide with your expertise.</p>

                {/* Progress Bar */}
                <div className="mt-8 flex justify-between items-center relative">
                    <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded" />
                    <div
                        className="absolute left-0 top-1/2 h-1 bg-primary-500 -z-10 -translate-y-1/2 transition-all duration-300 rounded"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    />
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors border-2 bg-white",
                                    currentStep >= index ? "border-primary-500 text-primary-600" : "border-gray-300 text-gray-400",
                                    currentStep > index ? "bg-primary-500 text-white" : ""
                                )}
                            >
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between px-2 mt-2 text-xs font-medium text-gray-500">
                    {steps.map((step, index) => (
                        <span key={step.id} className={cn(currentStep >= index ? "text-primary-600" : "")}>{step.title}</span>
                    ))}
                </div>
            </div>

            <Card className="w-full max-w-2xl shadow-xl border-0 overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardHeader className="bg-white border-b border-gray-100 flex-row px-8 space-y-0 py-6">
                        <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">

                        {/* Step 1: Personal Details */}
                        {currentStep === 0 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input id="fullName" placeholder="Jane Doe" {...register('fullName')} />
                                        {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" placeholder="jane@example.com" {...register('email')} />
                                        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" placeholder="+1 234 567 8900" {...register('phone')} />
                                        {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input id="city" placeholder="New York" {...register('city')} />
                                        {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Education & Subject */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <Label htmlFor="highestEducation">Highest Education</Label>
                                    <Input id="highestEducation" placeholder="e.g. Master's in Mathematics" {...register('highestEducation')} />
                                    {errors.highestEducation && <p className="text-sm text-red-500">{errors.highestEducation.message}</p>}
                                </div>

                                <div className="space-y-3">
                                    <Label>Subject Applying For</Label>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {subjects.map(subject => (
                                            <label
                                                key={subject}
                                                className={cn(
                                                    "cursor-pointer rounded-lg border p-4 hover:bg-gray-50 flex items-center justify-center text-center transition-all",
                                                    watch('subject') === subject ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500" : "border-gray-200"
                                                )}
                                            >
                                                <input type="radio" value={subject} {...register('subject')} className="sr-only" />
                                                <span className="text-sm font-medium">{subject}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.subject && <p className="text-sm text-red-500">{errors.subject.message}</p>}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Experience */}
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4 rounded-xl border p-5 bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Do you have prior teaching experience in Edtech online teaching?</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={priorExperience === true} onChange={() => setValue('priorExperience', true, { shouldValidate: true })} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                                <span>Yes</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={priorExperience === false} onChange={() => setValue('priorExperience', false, { shouldValidate: true })} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>

                                    {String(priorExperience) === 'true' && (
                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200 mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                                                <Input
                                                    id="yearsOfExperience"
                                                    type="number"
                                                    placeholder="e.g. 2"
                                                    {...register('yearsOfExperience', { valueAsNumber: true })}
                                                />
                                                {errors.yearsOfExperience && <p className="text-sm text-red-500">{errors.yearsOfExperience.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="companyName">Company Name</Label>
                                                <Input id="companyName" placeholder="Previous EdTech Corp" {...register('companyName')} />
                                                {errors.companyName && <p className="text-sm text-red-500">{errors.companyName.message}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 4: Availability */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4 rounded-xl border p-5 bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Are you currently working anywhere?</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={currentlyWorking === true} onChange={() => setValue('currentlyWorking', true, { shouldValidate: true })} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                                <span>Yes</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={currentlyWorking === false} onChange={() => setValue('currentlyWorking', false, { shouldValidate: true })} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>
                                    {String(currentlyWorking) === 'true' && (
                                        <div className="pt-4 border-t border-gray-200 mt-4 animate-in fade-in slide-in-from-top-2 flex gap-6">
                                            <Label className="mt-1">Work Type:</Label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" value="full-time" {...register('workType')} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                                <span>Full-time</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" value="part-time" {...register('workType')} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                                <span>Part-time</span>
                                            </label>
                                            {errors.workType && <p className="text-sm text-red-500 ml-4">{errors.workType.message}</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Label>Availability Preferences</Label>
                                    <label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="checkbox" {...register('available120Hours')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                        <span className="text-sm">Available 120 hours/month (approx 4 hrs/day)?</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="checkbox" {...register('openToWeekends')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                        <span className="text-sm">Open to working on weekends?</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="checkbox" {...register('comfortableNightShifts')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                        <span className="text-sm">Comfortable teaching evening/night shifts? (Comes with higher payout)</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Final Step */}
                        {currentStep === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <Label htmlFor="whyTeachWithUs">Why do you want to teach with us?</Label>
                                    <textarea
                                        id="whyTeachWithUs"
                                        className="flex min-h-[120px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                        placeholder="Tell us what motivates you to join our platform..."
                                        {...register('whyTeachWithUs')}
                                    />
                                    {errors.whyTeachWithUs && <p className="text-sm text-red-500">{errors.whyTeachWithUs.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Resume / CV (PDF)</Label>
                                    <label className={cn(
                                        "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                        cvFile && cvFile.length > 0
                                            ? "border-green-500 bg-green-50 hover:bg-green-100"
                                            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                                    )}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {cvFile && cvFile.length > 0 ? (
                                                <>
                                                    <CheckCircle2 className="w-8 h-8 mb-2 text-green-500" />
                                                    <p className="text-sm text-green-700 font-semibold">{cvFile[0].name}</p>
                                                    <p className="text-xs text-green-600 mt-1">Ready to upload</p>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className="w-8 h-8 mb-2 text-gray-500" />
                                                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                                    <p className="text-xs text-gray-500 mt-1">PDF (MAX. 5MB)</p>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf" {...register('cvFile')} />
                                    </label>
                                </div>
                            </div>
                        )}

                    </CardContent>
                    <CardFooter className="bg-gray-50 px-8 py-4 flex justify-between border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prev}
                            disabled={currentStep === 0}
                        >
                            Back
                        </Button>
                        {currentStep < steps.length - 1 ? (
                            <Button type="button" onClick={next}>
                                Next Step
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </Button>
                        )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
