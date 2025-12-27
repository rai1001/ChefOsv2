import React from 'react';
import type { LabelData } from './PrintService';

interface Props {
    data: LabelData | null;
}

export const LabelTemplate: React.FC<Props> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="print-only w-full h-full flex flex-col justify-between p-3 bg-white text-black font-sans box-border border-[0.5mm] border-black" style={{ width: '50mm', height: '30mm', overflow: 'hidden' }}>
            <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-start">
                    <div className="font-extrabold text-[13px] leading-tight uppercase line-clamp-2 flex-1 pr-2">
                        {data.title}
                    </div>
                </div>
                <div className="flex justify-between items-center text-[9px] mt-0.5 border-b border-black/20 pb-0.5">
                    <span className="font-mono bg-black text-white px-1 py-0.5 rounded-[2px]">{data.date.toLocaleDateString()}</span>
                    {data.quantity && <span className="font-black text-[10px]">{data.quantity}</span>}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                {data.expiryDate && (
                    <div className="flex items-center gap-1 bg-black/5 p-1 rounded">
                        <span className="font-bold text-[10px]">CADUCIDAD:</span>
                        <span className="font-black text-[11px] underline">{data.expiryDate.toLocaleDateString()}</span>
                    </div>
                )}

                {data.allergens && data.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {data.allergens.map(a => (
                            <span key={a} className="bg-black text-white px-1.5 py-0.5 rounded-full font-bold text-[7px] uppercase tracking-tighter">
                                {a.substring(0, 4)}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mt-auto pt-1">
                <span className="text-[6px] font-black opacity-20 uppercase tracking-widest">CHEF OS • SMART LABEL</span>
                <div className="w-4 h-4 bg-black rounded-[1px]"></div>
            </div>
        </div>
    );
};
