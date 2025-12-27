
import React, { useState } from 'react';
import { ChefHat, Warehouse, UtensilsCrossed, X, Check, ArrowRight } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface SetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

type Step = 'outlet' | 'product' | 'recipe';

export const SetupWizard: React.FC<SetupWizardProps> = ({ isOpen, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState<Step>('outlet');
    const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

    if (!isOpen) return null;

    const steps = [
        { id: 'outlet', label: 'Create Kitchen', icon: Warehouse },
        { id: 'product', label: 'Import Products', icon: ChefHat }, // ChefHat usually implies cooking, maybe Package? Using ChefHat as per prompt or standard
        { id: 'recipe', label: 'First Recipe', icon: UtensilsCrossed },
    ];

    const handleStepComplete = (step: Step) => {
        setCompletedSteps([...completedSteps, step]);
        if (step === 'outlet') setCurrentStep('product');
        if (step === 'product') setCurrentStep('recipe');
        if (step === 'recipe') onComplete();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Welcome to CulinaryOS</h2>
                        <p className="text-gray-400 text-sm">Let's set up your digital kitchen in 3 steps.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex border-b border-gray-800">
                    {steps.map((step, idx) => {
                        const isCompleted = completedSteps.includes(step.id as Step);
                        const isCurrent = currentStep === step.id;
                        return (
                            <div
                                key={step.id}
                                className={`flex-1 p-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors
                                    ${isCurrent ? 'bg-primary/5 text-primary border-b-2 border-primary' : ''}
                                    ${isCompleted ? 'text-emerald-500' : 'text-gray-600'}
                                `}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border
                                    ${isCompleted ? 'bg-emerald-500/10 border-emerald-500' : (isCurrent ? 'border-primary' : 'border-gray-700')}
                                `}>
                                    {isCompleted ? <Check size={14} /> : <span>{idx + 1}</span>}
                                </div>
                                {step.label}
                            </div>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="p-8 flex-1 overflow-y-auto">
                    {currentStep === 'outlet' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <EmptyState
                                title="No Kitchens Found"
                                description="Start by creating your main production center or restaurant outlet."
                                icon={Warehouse}
                            />
                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleStepComplete('outlet')} // Mock action
                                    className="btn-primary flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:bg-primary/90 transition-all"
                                >
                                    Create Main Kitchen <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 'product' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                             <EmptyState
                                title="Pantry is Empty"
                                description="Import your ingredient list from Excel or start from scratch."
                                icon={ChefHat}
                            />
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => handleStepComplete('product')}
                                    className="btn-secondary px-6 py-3 rounded-xl border border-gray-700 hover:bg-gray-800"
                                >
                                    Skip Import
                                </button>
                                <button
                                    onClick={() => handleStepComplete('product')}
                                    className="btn-primary bg-primary text-primary-foreground px-6 py-3 rounded-xl"
                                >
                                    Upload Excel
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 'recipe' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                             <EmptyState
                                title="Create First Dish"
                                description="Combine ingredients into a recipe to see costs and margins instantly."
                                icon={UtensilsCrossed}
                            />
                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleStepComplete('recipe')}
                                    className="btn-primary bg-primary text-primary-foreground px-8 py-3 rounded-xl flex items-center gap-2"
                                >
                                    Create Recipe <Check size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
