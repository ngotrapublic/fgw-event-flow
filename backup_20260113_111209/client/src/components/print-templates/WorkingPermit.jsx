import React from 'react';
import WorkingPermitPage1 from './WorkingPermitPage1';
import WorkingPermitPage2 from './WorkingPermitPage2';
import WorkingPermitPage3 from './WorkingPermitPage3';

const WorkingPermit = ({ data, onUpdate }) => {
    return (
        <div className="print-container">
            {/* Page 1 */}
            <div className="print-page-content">
                <WorkingPermitPage1 data={data} onUpdate={onUpdate} />
            </div>

            {/* Page 2 */}
            <div className="print-break-before">
                <WorkingPermitPage2 data={data} onUpdate={onUpdate} />
            </div>

            {/* Page 3 */}
            <div className="print-break-before">
                <WorkingPermitPage3 data={data} onUpdate={onUpdate} />
            </div>
        </div>
    );
};

export default WorkingPermit;
