import React, { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, ChevronDown, ChevronUp, Users, Hammer, Box,
    Download, FileSpreadsheet, Loader2, Calendar, Clock
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { InputGroup } from './EventFormHelpers';
import api from '../../services/api';
import { useToast } from '../Toast';

/**
 * ContractorCard - A collapsible card for managing a single contractor's data
 */
const ContractorCard = ({ control, register, index, remove, watch }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const { showSuccess, showError } = useToast();

    const contractorName = watch(`contractorPackages.${index}.contractorName`) || `Nhà thầu ${index + 1}`;

    // Equipment field array for this contractor
    const {
        fields: equipmentFields,
        append: appendEquipment,
        remove: removeEquipment
    } = useFieldArray({
        control,
        name: `contractorPackages.${index}.equipmentInOut`
    });

    // Personnel field array for this contractor
    const {
        fields: personnelFields,
        append: appendPersonnel,
        remove: removePersonnel
    } = useFieldArray({
        control,
        name: `contractorPackages.${index}.constructionPersonnel`
    });

    const handleDownloadTemplate = async (type) => {
        try {
            const endpoint = type === 'equipment' ? '/import/equipment-template' : '/import/personnel-template';
            const filename = type === 'equipment' ? 'Equipment_Import_Template.xlsx' : 'Personnel_Import_Template.xlsx';
            const response = await api.get(endpoint, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showError('Không thể tải file mẫu');
        }
    };

    const handleFileImport = async (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/import/parse-logistics?type=${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { equipment, personnel } = response.data;

            if (type === 'equipment' && equipment.length > 0) {
                equipment.forEach(item => appendEquipment(item));
                showSuccess(`Đã nhập ${equipment.length} vật dụng`);
            } else if (type === 'personnel' && personnel.length > 0) {
                personnel.forEach(p => appendPersonnel(p));
                showSuccess(`Đã nhập ${personnel.length} nhân sự`);
            } else {
                showError('Không tìm thấy dữ liệu phù hợp');
            }
        } catch (error) {
            showError('Lỗi khi đọc file Excel');
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden"
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                        {index + 1}
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800">{contractorName}</h4>
                        <p className="text-xs text-slate-500">
                            {equipmentFields.length} vật dụng • {personnelFields.length} nhân sự
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); remove(index); }}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 size={18} />
                    </Button>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
            </div>

            {/* Body */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-6 border-t border-slate-100">
                            {/* Contractor Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup label="Tên nhà thầu / Đơn vị">
                                    <Input
                                        {...register(`contractorPackages.${index}.contractorName`)}
                                        placeholder="Công ty TNHH ABC..."
                                        startIcon={Users}
                                    />
                                </InputGroup>
                                <InputGroup label="Nội dung thi công">
                                    <Input
                                        {...register(`contractorPackages.${index}.workDescription`)}
                                        placeholder="Thi công backdrop, sân khấu..."
                                        startIcon={Hammer}
                                    />
                                </InputGroup>
                            </div>

                            {/* Construction Time */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InputGroup label="Ngày bắt đầu">
                                    <Input type="date" {...register(`contractorPackages.${index}.startDate`)} startIcon={Calendar} />
                                </InputGroup>
                                <InputGroup label="Ngày kết thúc">
                                    <Input type="date" {...register(`contractorPackages.${index}.endDate`)} startIcon={Calendar} />
                                </InputGroup>
                                <InputGroup label="Giờ bắt đầu">
                                    <Input type="time" {...register(`contractorPackages.${index}.startTime`)} startIcon={Clock} />
                                </InputGroup>
                                <InputGroup label="Giờ kết thúc">
                                    <Input type="time" {...register(`contractorPackages.${index}.endTime`)} startIcon={Clock} />
                                </InputGroup>
                            </div>

                            {/* Equipment List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <Box size={16} /> Vật dụng mang vào
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDownloadTemplate('equipment')} className="text-[10px] h-7 px-2 text-slate-400">
                                            <Download size={12} className="mr-1" /> Template
                                        </Button>
                                        <input type="file" id={`import-eq-${index}`} className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileImport(e, 'equipment')} />
                                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-200" onClick={() => document.getElementById(`import-eq-${index}`).click()} disabled={isImporting}>
                                            {isImporting ? <Loader2 size={14} className="animate-spin mr-1" /> : <FileSpreadsheet size={14} className="mr-1" />}
                                            Import
                                        </Button>
                                    </div>
                                </div>
                                {equipmentFields.map((field, eqIndex) => (
                                    <div key={field.id} className="flex gap-2 items-start">
                                        <div className="flex-[2]"><Input {...register(`contractorPackages.${index}.equipmentInOut.${eqIndex}.name`)} placeholder="Tên vật dụng" /></div>
                                        <div className="flex-1"><Input {...register(`contractorPackages.${index}.equipmentInOut.${eqIndex}.specification`)} placeholder="Quy cách" /></div>
                                        <div className="flex-1"><Input {...register(`contractorPackages.${index}.equipmentInOut.${eqIndex}.quantity`)} placeholder="SL" /></div>
                                        <div className="flex-1"><Input {...register(`contractorPackages.${index}.equipmentInOut.${eqIndex}.notes`)} placeholder="Ghi chú" /></div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipment(eqIndex)} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="ghost" onClick={() => appendEquipment({ name: '', specification: '', quantity: '', notes: '' })} className="text-primary-600 gap-2">
                                    <Plus size={16} /> Thêm vật dụng
                                </Button>
                            </div>

                            {/* Personnel List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <Users size={16} /> Nhân sự thi công
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDownloadTemplate('personnel')} className="text-[10px] h-7 px-2 text-slate-400">
                                            <Download size={12} className="mr-1" /> Template
                                        </Button>
                                        <input type="file" id={`import-per-${index}`} className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileImport(e, 'personnel')} />
                                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-200" onClick={() => document.getElementById(`import-per-${index}`).click()} disabled={isImporting}>
                                            {isImporting ? <Loader2 size={14} className="animate-spin mr-1" /> : <FileSpreadsheet size={14} className="mr-1" />}
                                            Import
                                        </Button>
                                    </div>
                                </div>
                                {personnelFields.map((field, pIndex) => (
                                    <div key={field.id} className="flex gap-2 items-start">
                                        <div className="flex-[2]"><Input {...register(`contractorPackages.${index}.constructionPersonnel.${pIndex}.name`)} placeholder="Họ và tên" /></div>
                                        <div className="flex-1"><Input {...register(`contractorPackages.${index}.constructionPersonnel.${pIndex}.phone`)} placeholder="SĐT" /></div>
                                        <div className="flex-1"><Input {...register(`contractorPackages.${index}.constructionPersonnel.${pIndex}.idCard`)} placeholder="CCCD/CMND" /></div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePersonnel(pIndex)} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="ghost" onClick={() => appendPersonnel({ name: '', phone: '', idCard: '' })} className="text-primary-600 gap-2">
                                    <Plus size={16} /> Thêm nhân sự
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ContractorCard;
