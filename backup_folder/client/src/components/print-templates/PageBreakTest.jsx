import React from 'react';

const PageBreakTest = () => {
    return (
        <>
            {/* PAGE 1 */}
            <div style={{
                width: '210mm',
                height: '297mm',
                padding: '20mm',
                background: 'white',
                boxSizing: 'border-box'
            }}>
                <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>PAGE 1</h1>
                <p style={{ fontSize: '24px' }}>This is the first page content.</p>
                <p style={{ fontSize: '18px', marginTop: '40px' }}>
                    If you see "2 sheets of paper" in print dialog, page breaks are working!
                </p>
            </div>

            {/* PAGE 2 */}
            <div style={{
                width: '210mm',
                height: '297mm',
                padding: '20mm',
                background: 'white',
                pageBreakBefore: 'always',
                breakBefore: 'page',
                boxSizing: 'border-box'
            }}>
                <h1 style={{ fontSize: '48px', marginBottom: '20px', color: 'red' }}>PAGE 2</h1>
                <p style={{ fontSize: '24px' }}>This is the second page content.</p>
                <p style={{ fontSize: '18px', marginTop: '40px' }}>
                    If this appears on a separate page, the page break is working correctly!
                </p>
            </div>
        </>
    );
};

export default PageBreakTest;
