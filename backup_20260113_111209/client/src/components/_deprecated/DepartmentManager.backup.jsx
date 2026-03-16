import React, { useState } from 'react';
import { Plus, Mail, Building, Save, Trash2, Edit2, X } from 'lucide-react';
import { useDepartments } from '../hooks/useDepartments';

const DepartmentManager = () => {
    const {
        departments,
        loading,
        createDepartment,
        addEmail,
        updateDepartment,
        renameDepartment,
        deleteDepartment
    } = useDepartments();

    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptEmail, setNewDeptEmail] = useState('');

    // State for adding email to existing dept
    const [selectedDeptForEmail, setSelectedDeptForEmail] = useState(null);
    const [additionalEmail, setAdditionalEmail] = useState('');

    const handleAddDepartment = async (e) => {
        e.preventDefault();
        if (!newDeptName) return;
        try {
            await createDepartment({ name: newDeptName, email: newDeptEmail });
            setNewDeptName('');
            setNewDeptEmail('');
        } catch (error) {
            console.error('Error adding department:', error);
        }
    };

    const handleAddEmailToDept = async (deptName) => {
        if (!additionalEmail) return;
        try {
            await addEmail(deptName, additionalEmail);
            setAdditionalEmail('');
            setSelectedDeptForEmail(null);
        } catch (error) {
            console.error('Error adding email:', error);
        }
    };

    const [editingEmail, setEditingEmail] = useState({ deptName: '', index: -1, value: '' });
    const [editingDept, setEditingDept] = useState({ originalName: '', newName: '' });

    const handleUpdateEmail = async (deptName, index, newValue) => {
        const dept = departments.find(d => d.name === deptName);
        <h2 className="text-2xl font-bold text-slate-800">Department Management</h2>
            </div >

    {/* Add New Department Section */ }
    < div className = "bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8" >
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Building className="text-primary" size={20} />
                    <h3 className="text-lg font-semibold text-slate-800">Add New Department</h3>
                </div>
                <form onSubmit={handleAddDepartment} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700">Department Name</label>
                        <input
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            placeholder="e.g. IT Support"
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700">Default Email (Optional)</label>
                        <input
                            value={newDeptEmail}
                            onChange={(e) => setNewDeptEmail(e.target.value)}
                            placeholder="contact@example.com"
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition flex items-center gap-2">
                        <Plus size={18} /> Add
                    </button>
                </form>
            </div >

    {/* List Departments */ }
    < div className = "grid grid-cols-1 md:grid-cols-2 gap-6" >
    {
        departments.map(dept => (
            <div key={dept.name} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 group">
                <div className="flex justify-between items-start mb-4">
                    {editingDept.originalName === dept.name ? (
                        <div className="flex gap-2 items-center w-full">
                            <input
                                value={editingDept.newName}
                                onChange={(e) => setEditingDept({ ...editingDept, newName: e.target.value })}
                                className="flex-1 p-1 border border-slate-300 rounded text-lg font-bold"
                                autoFocus
                            />
                            <button onClick={() => handleRenameDepartment(dept.name)} className="text-green-600 hover:text-green-800"><Save size={20} /></button>
                            <button onClick={() => setEditingDept({ originalName: '', newName: '' })} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-slate-800">{dept.name}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingDept({ originalName: dept.name, newName: dept.name })} className="text-slate-400 hover:text-blue-500"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteDepartment(dept.name)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{dept.emails.length} emails</span>
                        </>
                    )}
                </div>

                <div className="space-y-2 mb-4">
                    {dept.emails.map((email, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg group">
                            {editingEmail.deptName === dept.name && editingEmail.index === idx ? (
                                <div className="flex gap-2 w-full">
                                    <input
                                        value={editingEmail.value}
                                        onChange={(e) => setEditingEmail({ ...editingEmail, value: e.target.value })}
                                        className="flex-1 p-1 border border-slate-300 rounded text-xs"
                                    />
                                    <button onClick={() => handleUpdateEmail(dept.name, idx, editingEmail.value)} className="text-green-600 hover:text-green-800"><Save size={14} /></button>
                                    <button onClick={() => setEditingEmail({ deptName: '', index: -1, value: '' })} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        <span className={idx === 0 ? "font-semibold text-primary" : ""}>{email} {idx === 0 && "(Default)"}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingEmail({ deptName: dept.name, index: idx, value: email })} className="p-1 text-slate-400 hover:text-blue-500" title="Edit"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteEmail(dept.name, idx)} className="p-1 text-slate-400 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {dept.emails.length === 0 && <p className="text-sm text-slate-400 italic">No emails added</p>}
                </div>

                {/* Add Email Form */}
                {selectedDeptForEmail === dept.name ? (
                    <div className="flex gap-2 items-center animate-fade-in">
                        <input
                            value={additionalEmail}
                            onChange={(e) => setAdditionalEmail(e.target.value)}
                            placeholder="New email..."
                            className="flex-1 p-2 text-sm border border-slate-200 rounded-lg outline-none"
                            autoFocus
                        />
                        <button onClick={() => handleAddEmailToDept(dept.name)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><Save size={16} /></button>
                        <button onClick={() => setSelectedDeptForEmail(null)} className="p-2 text-slate-400 hover:text-slate-600"><Trash2 size={16} /></button>
                    </div>
                ) : (
                    <button
                        onClick={() => setSelectedDeptForEmail(dept.name)}
                        className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:bg-slate-50 hover:text-primary hover:border-primary transition flex justify-center items-center gap-2"
                    >
                        <Plus size={16} /> Add Email
                    </button>
                )}
            </div>
        ))
    }
            </div >
        </div >
    );
};

export default DepartmentManager;
