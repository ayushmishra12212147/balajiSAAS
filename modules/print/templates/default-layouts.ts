export interface LayoutComponent {
  id: string;
  type:
    | "Text"
    | "DynamicField"
    | "Table"
    | "Line"
    | "Rectangle"
    | "Logo"
    | "QRCode"
    | "Barcode"
    | "Signature"
    | "PageNumber"
    | "Date"
    | "Time";
  content?: string;
  fieldName?: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  w: number; // percentage (0-100)
  h: number; // percentage (0-100)
  fontSize?: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  visible?: boolean;
  columns?: { header: string; field: string; w: number }[];
}

export interface PrintTemplateLayout {
  width?: number; // e.g. 100%
  height?: number;
  components?: LayoutComponent[];
  isRawHtml?: boolean;
  htmlContent?: string;
}

export function getDefaultLayoutFor(type: string): PrintTemplateLayout {
  if (type === "IPD_ADMISSION_FORM") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IPD Admission Slip</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
}
body{
    background:#fff;
    color:#000;
}
.page{
    width:148mm;
    min-height:210mm;
    margin:auto;
    padding:8mm;
}
.header{
    display:flex;
    justify-content:space-between;
    border-bottom:2px solid #000;
    padding-bottom:8px;
    margin-bottom:12px;
}
.hospital{
    display:flex;
    gap:10px;
}
.logo{
    width:60px;
    height:60px;
    object-fit:contain;
}
.hospital-info h2{
    font-size:20px;
    margin-bottom:3px;
}
.hospital-info p{
    font-size:11px;
    line-height:1.3;
}
.title{
    text-align:center;
    font-size:18px;
    font-weight:bold;
    margin-bottom:15px;
}
.details{
    font-size:13px;
}
.row{
    display:flex;
    gap:30px;
    margin-bottom:8px;
}
.field{
    width:48%;
}
.footer{
    margin-top:25px;
    display:flex;
    justify-content:space-between;
}
.sign{
    width:180px;
    text-align:center;
}
.sign-line{
    margin-top:45px;
    border-top:1px solid #000;
    padding-top:5px;
}
.note{
    margin-top:20px;
    font-size:11px;
    text-align:center;
}
@page{
    size:A5 portrait;
    margin:8mm;
}
</style>
</head>
<body>
<div class="page">
<div class="header">
<div class="hospital">
<img src="{{hospitalLogo}}" class="logo">
<div class="hospital-info">
<h2>{{hospitalName}}</h2>
<p>{{hospitalAddress}}</p>
<p>{{hospitalPhone}}</p>
<p>{{hospitalEmail}}</p>
</div>
</div>
</div>
<div class="title">
IPD ADMISSION SLIP
</div>
<div class="details">
<div class="row">
<div class="field"><b>IPD No :</b> {{ipdNumber}}</div>
<div class="field"><b>UHID :</b> {{uhid}}</div>
</div>
<div class="row">
<div class="field"><b>Patient :</b> {{patientName}}</div>
<div class="field"><b>Age / Sex :</b> {{age}} / {{gender}}</div>
</div>
<div class="row">
<div class="field"><b>Mobile :</b> {{mobile}}</div>
<div class="field"><b>Admission :</b> {{admissionDate}}</div>
</div>
<div class="row">
<div class="field"><b>Department :</b> {{department}}</div>
<div class="field"><b>Consultant :</b> {{doctorName}}</div>
</div>
<div class="row">
<div class="field"><b>Ward :</b> {{ward}}</div>
<div class="field"><b>Room / Bed :</b> {{room}} / {{bed}}</div>
</div>
<div class="row">
<div class="field"><b>Admission Type :</b> {{admissionType}}</div>
<div class="field"><b>Attendant :</b> {{attendantName}}</div>
</div>
</div>
<div class="footer">
<div class="sign">
<div class="sign-line">
Admission Clerk
</div>
</div>
<div class="sign">
<div class="sign-line">
Patient / Attendant
</div>
</div>
</div>
<div class="note">
Please carry this slip throughout the admission period.
</div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "IPD_DISCHARGE_SLIP") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IPD Discharge Slip</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Arial,Helvetica,sans-serif;
}
body{
    background:#fff;
    color:#000;
}
.page{
    width:148mm;
    min-height:210mm;
    margin:auto;
    padding:8mm;
}
.header{
    display:flex;
    align-items:flex-start;
    gap:10px;
    border-bottom:2px solid #000;
    padding-bottom:8px;
    margin-bottom:12px;
}
.logo{
    width:60px;
    height:60px;
    object-fit:contain;
}
.hospital h2{
    font-size:20px;
    margin-bottom:3px;
}
.hospital p{
    font-size:11px;
    line-height:1.4;
}
.title{
    text-align:center;
    font-size:18px;
    font-weight:bold;
    margin-bottom:15px;
}
.details{
    font-size:13px;
}
.row{
    display:flex;
    gap:30px;
    margin-bottom:8px;
}
.field{
    width:48%;
}
.bill-box{
    border:1px solid #000;
    padding:10px;
    margin-top:15px;
}
.bill-box h3{
    text-align:center;
    margin-bottom:10px;
    font-size:15px;
}
.bill-row{
    display:flex;
    justify-content:space-between;
    margin-bottom:6px;
}
.footer{
    display:flex;
    justify-content:space-between;
    margin-top:30px;
}
.sign{
    width:170px;
    text-align:center;
}
.line{
    border-top:1px solid #000;
    margin-top:45px;
    padding-top:5px;
}
.note{
    margin-top:18px;
    text-align:center;
    font-size:11px;
}
@page{
    size:A5 portrait;
    margin:8mm;
}
</style>
</head>
<body>
<div class="page">
<div class="header">
<img src="{{hospitalLogo}}" class="logo">
<div class="hospital">
<h2>{{hospitalName}}</h2>
<p>{{hospitalAddress}}</p>
<p>{{hospitalPhone}}</p>
<p>{{hospitalEmail}}</p>
</div>
</div>
<div class="title">
IPD DISCHARGE SLIP
</div>
<div class="details">
<div class="row">
<div class="field"><b>IPD No :</b> {{ipdNumber}}</div>
<div class="field"><b>UHID :</b> {{uhid}}</div>
</div>
<div class="row">
<div class="field"><b>Patient :</b> {{patientName}}</div>
<div class="field"><b>Age / Sex :</b> {{age}} / {{gender}}</div>
</div>
<div class="row">
<div class="field"><b>Admission :</b> {{admissionDate}}</div>
<div class="field"><b>Discharge :</b> {{dischargeDate}}</div>
</div>
<div class="row">
<div class="field"><b>Consultant :</b> {{doctorName}}</div>
<div class="field"><b>Ward / Bed :</b> {{ward}} / {{bed}}</div>
</div>
</div>
<div class="bill-box">
<h3>Billing Summary</h3>
<div class="bill-row">
<span>Total Bill</span>
<span>₹ {{totalBill}}</span>
</div>
<div class="bill-row">
<span>Paid Amount</span>
<span>₹ {{paidAmount}}</span>
</div>
<div class="bill-row">
<span>Discount</span>
<span>₹ {{discount}}</span>
</div>
<div class="bill-row">
<span>Balance Due</span>
<span>₹ {{dueAmount}}</span>
</div>
<div class="bill-row">
<span>Payment Mode</span>
<span>{{paymentMode}}</span>
</div>
</div>
<div class="footer">
<div class="sign">
<div class="line">
Billing Officer
</div>
</div>
<div class="sign">
<div class="line">
Doctor
</div>
</div>
</div>
<div class="note">
Patient has been discharged from the hospital.
</div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "DISCHARGE_SUMMARY") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Discharge Summary</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family: Arial, Helvetica, sans-serif;
}
body{
    padding:10mm;
    background:#fff;
    color:#1e293b;
}
.page{
    width:100%;
}
.header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    border-bottom:2px solid #0f766e;
    padding-bottom:10px;
    margin-bottom:15px;
}
.hospital{
    display:flex;
    gap:10px;
    align-items: center;
}
.logo{
    width:42px;
    height:42px;
    background: #0f766e;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-size: 20px;
}
.hospital-info h2{
    font-size:18px;
    font-weight:900;
    color:#115e59;
}
.hospital-info p{
    font-size:9px;
    color:#64748b;
    line-height:1.2;
}
.title-block{
    text-align:right;
}
.title-block h3{
    font-size:12px;
    font-weight:800;
    color:#0f766e;
    text-transform: uppercase;
}
.title-block p{
    font-size:9px;
    color:#64748b;
    margin-top:2px;
}
.summary-label {
    font-size: 13px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1e293b;
}
.details-grid{
    display: flex;
    gap: 15px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 15px;
}
.details-col{
    flex: 1;
}
.details-row{
    display:flex;
    font-size:10.5px;
    margin-bottom:4px;
}
.details-label{
    width:35%;
    color:#64748b;
    font-weight:600;
}
.details-val{
    width:65%;
    color:#1e293b;
    font-weight:750;
}
.section{
    margin-bottom:12px;
}
.section-title{
    font-size:11px;
    font-weight:bold;
    color:#0f766e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 5px;
}
.section-content{
    font-size:10.5px;
    color:#334155;
    line-height:1.4;
    white-space: pre-line;
}
.footer{
    margin-top:40px;
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
}
.footer-note{
    font-size:9px;
    color:#94a3b8;
    width:50%;
}
.signatures{
    display:flex;
    gap:20px;
}
.signature-box{
    text-align:center;
    width:130px;
}
.sig-line{
    border-top:1px solid #cbd5e1;
    margin-top:40px;
    padding-top:3px;
    font-size:9.5px;
    font-weight:bold;
    color:#64748b;
    text-transform:uppercase;
}
@page{
    size:A4 portrait;
    margin:10mm;
}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="hospital">
            <div class="logo">+</div>
            <div class="hospital-info">
                <h2>{{hospitalName}}</h2>
                <p>Multi-Speciality Care & Clinical Research</p>
                <p>Contact: {{hospitalEmail}} | Phone: {{hospitalPhone}}</p>
            </div>
        </div>
        <div class="title-block">
            <h3>PATIENT DISCHARGE SUMMARY</h3>
            <p>IPD No: {{ipdNumber}}</p>
            <p>UHID: {{uhid}}</p>
        </div>
    </div>
    
    <div class="summary-label">Discharge Certificate Card</div>
    
    <div class="details-grid">
        <div class="details-col">
            <div class="details-row"><span class="details-label">Patient Name:</span><span class="details-val">{{patientName}}</span></div>
            <div class="details-row"><span class="details-label">UHID:</span><span class="details-val" style="font-family: monospace;">{{uhid}}</span></div>
            <div class="details-row"><span class="details-label">Age / Gender:</span><span class="details-val">{{age}} Yrs / {{gender}}</span></div>
            <div class="details-row"><span class="details-label">Mobile:</span><span class="details-val">{{mobile}}</span></div>
        </div>
        <div class="details-col">
            <div class="details-row"><span class="details-label">IPD Number:</span><span class="details-val">{{ipdNumber}}</span></div>
            <div class="details-row"><span class="details-label">Admission Date:</span><span class="details-val">{{admissionDate}}</span></div>
            <div class="details-row"><span class="details-label">Discharge Date:</span><span class="details-val">{{dischargeDate}}</span></div>
            <div class="details-row"><span class="details-label">Ward / Bed:</span><span class="details-val">{{ward}} / {{bed}}</span></div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Attending Doctor</div>
        <div class="section-content" style="font-weight: bold; color: #1e293b;">Dr. {{doctorName}} ({{department}})</div>
    </div>
    
    <div class="section">
        <div class="section-title">Chief Complaints & History</div>
        <div class="section-content">{{chiefComplaints}}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Final Diagnosis / ICD Codes</div>
        <div class="section-content" style="font-weight: bold;">{{diagnosis}}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Clinical Course & Summary</div>
        <div class="section-content">{{clinicalSummary}}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Investigations (Lab & Radiology)</div>
        <div class="section-content">{{investigations}}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Treatment Given & Procedures Performed</div>
        <div class="section-content">{{treatment}}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Condition At Discharge</div>
        <div class="section-content" style="font-weight: bold;">{{condition}}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Discharge Advice & Follow-Up Plan (Medications)</div>
        <div class="section-content" style="background: #faf5ff; border: 1px dashed #d8b4fe; padding: 10px; border-radius: 6px;">{{advice}}</div>
    </div>
    
    <div class="footer" style="page-break-inside: avoid;">
        <div class="footer-note">
            * This represents a clinical summary of the patient's inpatient stay and discharge advice. Please follow the Rx plan.
        </div>
        <div class="signatures">
            <div class="signature-box">
                <div class="sig-line">Treating Physician</div>
            </div>
            <div class="signature-box">
                <div class="sig-line">Medical Superintendent</div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "LABORATORY_REPORT") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Laboratory Report</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
}
body{
    background:#fff;
    color:#000;
}
.page{
    width:210mm;
    min-height:297mm;
    padding:12mm;
    margin:auto;
}
.header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    border-bottom:2px solid #000;
    padding-bottom:10px;
    margin-bottom:15px;
}
.hospital{
    display:flex;
    gap:12px;
}
.logo{
    width:70px;
    height:70px;
}
.hospital-info h2{
    font-size:24px;
    margin-bottom:4px;
}
.hospital-info p{
    font-size:12px;
    line-height:1.4;
}
.department{
    text-align:right;
}
.department h3{
    font-size:18px;
}
.department p{
    font-size:13px;
}
.title{
    text-align:center;
    font-size:22px;
    font-weight:bold;
    margin-bottom:18px;
}
.details{
    margin-bottom:18px;
    font-size:14px;
}
.row{
    display:flex;
    gap:60px;
    margin-bottom:10px;
}
.field{
    width:320px;
}
table{
    width:100%;
    border-collapse:collapse;
    margin-top:10px;
}
th,td{
    border:1px solid #000;
    padding:8px;
    font-size:13px;
}
th{
    background:#f2f2f2;
}
th:nth-child(1){
    width:40%;
}
th:nth-child(2){
    width:20%;
}
th:nth-child(3){
    width:15%;
}
th:nth-child(4){
    width:25%;
}
.note{
    margin-top:20px;
    font-size:13px;
}
.footer{
    display:flex;
    justify-content:flex-end;
    margin-top:40px;
}
.signature{
    width:220px;
    text-align:center;
}
.line{
    border-top:1px solid #000;
    margin-top:55px;
    padding-top:6px;
}
@page{
    size:A4 portrait;
    margin:10mm;
}
</style>
</head>
<body>
<div class="page">
<div class="header">
<div class="hospital">
<img src="{{hospitalLogo}}" class="logo">
<div class="hospital-info">
<h2>{{hospitalName}}</h2>
<p>{{hospitalAddress}}</p>
<p>{{hospitalPhone}}</p>
<p>{{hospitalEmail}}</p>
</div>
</div>
<div class="department">
<h3>Laboratory</h3>
<p>{{labDepartment}}</p>
</div>
</div>
<div class="title">
LABORATORY REPORT
</div>
<div class="details">
<div class="row">
<div class="field">
<b>UHID :</b> {{uhid}}
</div>
<div class="field">
<b>Lab No :</b> {{labNumber}}
</div>
</div>
<div class="row">
<div class="field">
<b>Patient :</b> {{patientName}}
</div>
<div class="field">
<b>Age / Sex :</b> {{age}} / {{gender}}
</div>
</div>
<div class="row">
<div class="field">
<b>Ref. Doctor :</b> {{doctorName}}
</div>
<div class="field">
<b>Report Date :</b> {{reportDate}}
</div>
</div>
</div>
<table>
<thead>
<tr>
<th>Test</th>
<th>Result</th>
<th>Unit</th>
<th>Reference Range</th>
</tr>
</thead>
<tbody>
{{testRows}}
</tbody>
</table>
<div class="note">
<b>Remarks :</b>
{{remarks}}
</div>
<div class="footer">
<div class="signature">
<div class="line">
Pathologist
</div>
</div>
</div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "RADIOLOGY_REPORT") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Radiology Report</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
}
body{
    background:#fff;
    color:#000;
}
.page{
    width:210mm;
    min-height:297mm;
    padding:12mm;
    margin:auto;
}
.header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    border-bottom:2px solid #000;
    padding-bottom:10px;
    margin-bottom:15px;
}
.hospital{
    display:flex;
    gap:12px;
}
.logo{
    width:70px;
    height:70px;
}
.hospital-info h2{
    font-size:24px;
    margin-bottom:4px;
}
.hospital-info p{
    font-size:12px;
    line-height:1.4;
}
.department{
    text-align:right;
}
.department h3{
    font-size:18px;
}
.department p{
    font-size:13px;
}
.title{
    text-align:center;
    font-size:22px;
    font-weight:bold;
    margin-bottom:18px;
}
.details{
    font-size:14px;
    margin-bottom:18px;
}
.row{
    display:flex;
    gap:60px;
    margin-bottom:10px;
}
.field{
    width:320px;
}
.section{
    margin-bottom:18px;
}
.section h3{
    font-size:15px;
    margin-bottom:6px;
}
.box{
    border:1px solid #000;
    min-height:80px;
    padding:10px;
}
.large{
    min-height:140px;
}
.footer{
    display:flex;
    justify-content:flex-end;
    margin-top:35px;
}
.signature{
    width:220px;
    text-align:center;
}
.line{
    border-top:1px solid #000;
    margin-top:60px;
    padding-top:6px;
}
@page{
    size:A4 portrait;
    margin:10mm;
}
</style>
</head>
<body>
<div class="page">
<div class="header">
<div class="hospital">
<img src="{{hospitalLogo}}" class="logo">
<div class="hospital-info">
<h2>{{hospitalName}}</h2>
<p>{{hospitalAddress}}</p>
<p>{{hospitalPhone}}</p>
<p>{{hospitalEmail}}</p>
</div>
</div>
<div class="department">
<h3>Radiology</h3>
<p>{{department}}</p>
</div>
</div>
<div class="title">
RADIOLOGY REPORT
</div>
<div class="details">
<div class="row">
<div class="field">
<b>UHID :</b> {{uhid}}
</div>
<div class="field">
<b>Report No :</b> {{reportNumber}}
</div>
</div>
<div class="row">
<div class="field">
<b>Patient :</b> {{patientName}}
</div>
<div class="field">
<b>Age / Sex :</b> {{age}} / {{gender}}
</div>
</div>
<div class="row">
<div class="field">
<b>Ref. Doctor :</b> {{doctorName}}
</div>
<div class="field">
<b>Report Date :</b> {{reportDate}}
</div>
</div>
<div class="row">
<div class="field">
<b>Investigation :</b> {{investigationName}}
</div>
<div class="field">
<b>Modality :</b> {{modality}}
</div>
</div>
</div>
<div class="section">
<h3>Clinical History</h3>
<div class="box">
{{clinicalHistory}}
</div>
</div>
<div class="section">
<h3>Findings</h3>
<div class="box large">
{{findings}}
</div>
</div>
<div class="section">
<h3>Impression</h3>
<div class="box">
{{impression}}
</div>
</div>
<div class="footer">
<div class="signature">
<div class="line">
Radiologist
</div>
</div>
</div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "PAYMENT_RECEIPT") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payment Receipt</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family: Arial, Helvetica, sans-serif;
}
body{
    padding:10mm;
    background:#fff;
    color:#1e293b;
}
.page{
    width:100%;
}
.header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    border-bottom:2px solid #0f766e;
    padding-bottom:10px;
    margin-bottom:15px;
}
.hospital{
    display:flex;
    gap:10px;
    align-items: center;
}
.logo{
    width:42px;
    height:42px;
    background: #0f766e;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-size: 20px;
}
.hospital-info h2{
    font-size:18px;
    font-weight:900;
    color:#115e59;
}
.hospital-info p{
    font-size:9px;
    color:#64748b;
    line-height:1.2;
}
.title-block{
    text-align:right;
}
.title-block h3{
    font-size:12px;
    font-weight:800;
    color:#0f766e;
    text-transform: uppercase;
}
.title-block p{
    font-size:9px;
    color:#64748b;
    margin-top:2px;
}
.receipt-label {
    font-size: 13px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1e293b;
}
.details-grid{
    display: flex;
    gap: 15px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 15px;
}
.details-col{
    flex: 1;
}
.details-row{
    display:flex;
    font-size:10.5px;
    margin-bottom:4px;
}
.details-label{
    width:35%;
    color:#64748b;
    font-weight:600;
}
.details-val{
    width:65%;
    color:#1e293b;
    font-weight:750;
}
table{
    width:100%;
    border-collapse:collapse;
    margin-bottom:15px;
}
th,td{
    border:1px solid #cbd5e1;
    padding:8px 10px;
    font-size:11px;
    text-align: left;
}
th{
    background:#f1f5f9;
    font-weight: bold;
    color: #475569;
    text-transform: uppercase;
    font-size: 10px;
}
.right-align{
    text-align:right;
}
.summary-container{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    margin-top:10px;
}
.words-panel{
    width:55%;
    font-size:10px;
    color:#475569;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
}
.summary-box{
    width:38%;
    border:1px solid #e2e8f0;
    border-radius:8px;
    padding:10px;
    background:#fafafa;
}
.summary-row{
    display:flex;
    justify-content:space-between;
    font-size:11px;
    margin-bottom:6px;
    color: #475569;
}
.summary-row.total{
    border-top:1px solid #cbd5e1;
    padding-top:6px;
    margin-top:6px;
    font-size:12.5px;
    font-weight:bold;
    color:#0f172a;
}
.summary-row.highlight{
    color: #0d9488;
    font-weight: bold;
}
.footer{
    margin-top:40px;
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
}
.footer-note{
    font-size:9px;
    color:#94a3b8;
    width:50%;
}
.signatures{
    display:flex;
    gap:20px;
}
.signature-box{
    text-align:center;
    width:130px;
}
.sig-line{
    border-top:1px solid #cbd5e1;
    margin-top:40px;
    padding-top:3px;
    font-size:9.5px;
    font-weight:bold;
    color:#64748b;
    text-transform:uppercase;
}
@page{
    size:A4 portrait;
    margin:10mm;
}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="hospital">
            <div class="logo">+</div>
            <div class="hospital-info">
                <h2>{{hospitalName}}</h2>
                <p>Multi-Speciality Care & Clinical Research</p>
                <p>Contact: {{hospitalEmail}} | Phone: {{hospitalPhone}}</p>
            </div>
        </div>
        <div class="title-block">
            <h3>OFFICIAL PAYMENT RECEIPT</h3>
            <p>Receipt No: {{receiptNo}}</p>
            <p>Date: {{receiptDate}}</p>
        </div>
    </div>
    
    <div class="receipt-label">Transaction Receipt</div>
    
    <div class="details-grid">
        <div class="details-col">
            <div class="details-row"><span class="details-label">Patient Name:</span><span class="details-val">{{patientName}}</span></div>
            <div class="details-row"><span class="details-label">UHID:</span><span class="details-val" style="font-family: monospace;">{{uhid}}</span></div>
        </div>
        <div class="details-col">
            <div class="details-row"><span class="details-label">Receipt Number:</span><span class="details-val">{{receiptNo}}</span></div>
            <div class="details-row"><span class="details-label">Transaction Date:</span><span class="details-val">{{receiptDate}}</span></div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Particular / Charge Item</th>
                <th style="width: 30%; text-align: right;">Amount Transacted (₹)</th>
            </tr>
        </thead>
        <tbody>
            {{receiptItems}}
        </tbody>
    </table>
    
    <div class="summary-container">
        <div class="words-panel">
            <b style="color: #1e293b;">Amount in Words:</b><br/>
            <span style="font-weight: 600; text-transform: capitalize; margin-top: 4px; display: inline-block;">{{amountInWords}}</span>
        </div>
        
        <div class="summary-box">
            <div class="summary-row">
                <span>Receipt Total:</span>
                <span>₹ {{totalAmount}}</span>
            </div>
            <div class="summary-row">
                <span>Discount Applied:</span>
                <span>₹ {{discount}}</span>
            </div>
            <div class="summary-row total highlight">
                <span>Amount Paid:</span>
                <span>₹ {{paidAmount}}</span>
            </div>
            <div class="summary-row" style="margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
                <span>Payment Mode:</span>
                <span style="text-transform: uppercase; font-weight: bold;">{{paymentMode}}</span>
            </div>
            <div class="summary-row">
                <span>Transaction Ref:</span>
                <span style="font-family: monospace; font-size: 10px;">{{transactionId}}</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <div class="footer-note">
            * Thank you for choosing {{hospitalName}}. This receipt represents formal acknowledgement of payments made.
        </div>
        <div class="signatures">
            <div class="signature-box">
                <div class="sig-line">Cashier / Accountant</div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "HOSPITAL_INVOICE") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Consolidated Billing Statement</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family: Arial, Helvetica, sans-serif;
}
body{
    padding:10mm;
    background:#fff;
    color:#1e293b;
}
.page{
    width:100%;
}
.header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    border-bottom:2px solid #0f766e;
    padding-bottom:10px;
    margin-bottom:15px;
}
.hospital{
    display:flex;
    gap:10px;
    align-items: center;
}
.logo{
    width:42px;
    height:42px;
    background: #0f766e;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-size: 20px;
}
.hospital-info h2{
    font-size:18px;
    font-weight:900;
    color:#115e59;
}
.hospital-info p{
    font-size:9px;
    color:#64748b;
    line-height:1.2;
}
.title-block{
    text-align:right;
}
.title-block h3{
    font-size:12px;
    font-weight:800;
    color:#0f766e;
    text-transform: uppercase;
}
.title-block p{
    font-size:9px;
    color:#64748b;
    margin-top:2px;
}
.invoice-label {
    font-size: 13px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1e293b;
}
.details-grid{
    display: flex;
    gap: 15px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 15px;
}
.details-col{
    flex: 1;
}
.details-row{
    display:flex;
    font-size:10.5px;
    margin-bottom:4px;
}
.details-label{
    width:35%;
    color:#64748b;
    font-weight:600;
}
.details-val{
    width:65%;
    color:#1e293b;
    font-weight:750;
}
table{
    width:100%;
    border-collapse:collapse;
    margin-bottom:15px;
}
th,td{
    border:1px solid #cbd5e1;
    padding:8px 10px;
    font-size:11px;
    text-align: left;
}
th{
    background:#f1f5f9;
    font-weight: bold;
    color: #475569;
    text-transform: uppercase;
    font-size: 10px;
}
.right-align{
    text-align:right;
}
.summary-container{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    margin-top:10px;
}
.words-panel{
    width:55%;
    font-size:10px;
    color:#475569;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
}
.summary-box{
    width:38%;
    border:1px solid #e2e8f0;
    border-radius:8px;
    padding:10px;
    background:#fafafa;
}
.summary-row{
    display:flex;
    justify-content:space-between;
    font-size:11px;
    margin-bottom:6px;
    color: #475569;
}
.summary-row.total{
    border-top:1px solid #cbd5e1;
    padding-top:6px;
    margin-top:6px;
    font-size:12.5px;
    font-weight:bold;
    color:#0f172a;
}
.summary-row.highlight{
    color: #0d9488;
    font-weight: bold;
}
.footer{
    margin-top:40px;
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
}
.footer-note{
    font-size:9px;
    color:#94a3b8;
    width:50%;
}
.signatures{
    display:flex;
    gap:20px;
}
.signature-box{
    text-align:center;
    width:130px;
}
.sig-line{
    border-top:1px solid #cbd5e1;
    margin-top:40px;
    padding-top:3px;
    font-size:9.5px;
    font-weight:bold;
    color:#64748b;
    text-transform:uppercase;
}
@page{
    size:A4 portrait;
    margin:10mm;
}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="hospital">
            <div class="logo">+</div>
            <div class="hospital-info">
                <h2>{{hospitalName}}</h2>
                <p>Multi-Speciality Care & Clinical Research</p>
                <p>Contact: {{hospitalEmail}} | Phone: {{hospitalPhone}}</p>
            </div>
        </div>
        <div class="title-block">
            <h3>CONSOLIDATED BILLING STATEMENT</h3>
            <p>Invoice No: {{invoiceNo}}</p>
            <p>Date: {{invoiceDate}}</p>
        </div>
    </div>
    
    <div class="invoice-label">Patient Statement of Account</div>
    
    <div class="details-grid">
        <div class="details-col">
            <div class="details-row"><span class="details-label">Patient Name:</span><span class="details-val">{{patientName}}</span></div>
            <div class="details-row"><span class="details-label">UHID:</span><span class="details-val" style="font-family: monospace;">{{uhid}}</span></div>
            <div class="details-row"><span class="details-label">Age / Gender:</span><span class="details-val">{{patientAge}} Yrs / {{patientGender}}</span></div>
            <div class="details-row"><span class="details-label">Mobile:</span><span class="details-val">{{patientMobile}}</span></div>
        </div>
        <div class="details-col">
            <div class="details-row"><span class="details-label">Invoice Number:</span><span class="details-val">{{invoiceNo}}</span></div>
            <div class="details-row"><span class="details-label">Billing Date:</span><span class="details-val">{{invoiceDate}}</span></div>
            <div class="details-row"><span class="details-label">Admission Ref:</span><span class="details-val">{{ipdNumber}}</span></div>
            <div class="details-row"><span class="details-label">Ward / Bed:</span><span class="details-val">{{ward}} / {{bed}}</span></div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Particular / Charge Item</th>
                <th style="width: 15%; text-align: right;">Qty</th>
                <th style="width: 20%; text-align: right;">Rate (₹)</th>
                <th style="width: 25%; text-align: right;">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            {{invoiceItems}}
        </tbody>
    </table>
    
    <div class="summary-container">
        <div class="words-panel">
            <b style="color: #1e293b;">Amount in Words:</b><br/>
            <span style="font-weight: 600; text-transform: capitalize; margin-top: 4px; display: inline-block;">{{amountInWords}}</span>
        </div>
        
        <div class="summary-box">
            <div class="summary-row">
                <span>Sub Total:</span>
                <span>₹ {{subTotal}}</span>
            </div>
            <div class="summary-row">
                <span>Discount:</span>
                <span style="color: #ef4444;">₹ {{discount}}</span>
            </div>
            <div class="summary-row">
                <span>Tax Amount (GST):</span>
                <span>₹ {{gstAmount}}</span>
            </div>
            <div class="summary-row total">
                <span>Gross Bill Total:</span>
                <span>₹ {{grandTotal}}</span>
            </div>
            <div class="summary-row highlight" style="margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
                <span>Total Paid:</span>
                <span>₹ {{paidAmount}}</span>
            </div>
            <div class="summary-row total highlight" style="border-top: none; padding-top: 0; margin-top: 0; color: #b91c1c;">
                <span>Net Outstanding Dues:</span>
                <span>₹ {{balanceAmount}}</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <div class="footer-note">
            * This statement represents a final reconciled account of hospital care charges. Get well soon!
        </div>
        <div class="signatures">
            <div class="signature-box">
                <div class="sig-line">Patient / Attendant</div>
            </div>
            <div class="signature-box">
                <div class="sig-line">Authorized Signatory</div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "OPD_REGISTRATION_SLIP") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OPD Registration Slip</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family: Arial, Helvetica, sans-serif;
}
body{
    padding:6mm 8mm;
    background:#fff;
    color: #1e293b;
}
.slip-container {
    width: 100%;
    max-width: 100%;
    margin: 0;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 6px;
    margin-bottom: 10px;
}
.hospital-brand {
    display: flex;
    align-items: center;
    gap: 8px;
}
.hospital-logo {
    width: 32px;
    height: 32px;
    background: #2563eb;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-size: 16px;
}
.hospital-info h1 {
    font-size: 14px;
    font-weight: 900;
    color: #1e3a8a;
    letter-spacing: -0.5px;
}
.hospital-info p {
    font-size: 8px;
    color: #64748b;
    margin-top: 1px;
    line-height: 1.2;
}
.slip-title-block {
    text-align: right;
}
.slip-title-block h2 {
    font-size: 10px;
    font-weight: bold;
    color: #1e293b;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
.token-no {
    font-size: 11px;
    color: #2563eb;
    font-weight: bold;
    margin-top: 1px;
}
.print-date {
    font-size: 7px;
    color: #94a3b8;
    margin-top: 1px;
}
.info-grid {
    display: flex;
    gap: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 10px;
}
.info-column {
    flex: 1;
}
.info-column h3 {
    font-size: 8.5px;
    font-weight: bold;
    color: #1e3a8a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 5px;
}
.field-row {
    font-size: 9px;
    margin-bottom: 3px;
    display: flex;
}
.field-label {
    width: 32%;
    color: #94a3b8;
    font-weight: 600;
}
.field-val {
    width: 68%;
    color: #334155;
    font-weight: 700;
}
.complaints-box {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px;
    margin-bottom: 10px;
}
.complaints-title {
    font-size: 8px;
    font-weight: bold;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 3px;
}
.complaints-text {
    font-size: 9px;
    color: #334155;
    min-height: 25px;
}
.footer-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 10px;
}
.footer-note {
    font-size: 8px;
    color: #94a3b8;
    font-style: italic;
    width: 60%;
}
.signature-box {
    text-align: center;
    width: 35%;
}
.sig-line {
    border-top: 1px solid #cbd5e1;
    margin-top: 25px;
    padding-top: 2px;
    font-size: 8px;
    font-weight: bold;
    color: #475569;
    text-transform: uppercase;
}
@page{
    size: A5 portrait;
    margin: 0mm;
}
</style>
</head>
<body>
<div class="slip-container">
    <div class="header">
        <div class="hospital-brand">
            <div class="hospital-logo">+</div>
            <div class="hospital-info">
                <h1>{{hospitalName}}</h1>
                <p>Multi-Speciality Care & Clinical Research</p>
                <p>Contact: {{hospitalEmail}} | Phone: {{hospitalPhone}}</p>
            </div>
        </div>
        <div class="slip-title-block">
            <h2>OPD CONSULTATION SLIP</h2>
            <div class="token-no">Token No: #{{OPD.Token}}</div>
            <div class="print-date">Date: {{OPD.Date}}</div>
        </div>
    </div>
    <div class="info-grid">
        <div class="info-column">
            <h3>Patient Details</h3>
            <div class="field-row"><span class="field-label">Name:</span><span class="field-val">{{Patient.Name}}</span></div>
            <div class="field-row"><span class="field-label">UHID:</span><span class="field-val" style="font-family: monospace;">{{Patient.UHID}}</span></div>
            <div class="field-row"><span class="field-label">Demography:</span><span class="field-val">{{Patient.Age}} Yrs / {{Patient.Gender}}</span></div>
            <div class="field-row"><span class="field-label">Mobile:</span><span class="field-val">{{Patient.Phone}}</span></div>
            <div class="field-row"><span class="field-label">Address:</span><span class="field-val" style="font-size: 8.5px; line-height: 1.1;">{{Patient.Address}}</span></div>
        </div>
        <div class="info-column">
            <h3>Consulting Doctor</h3>
            <div class="field-row"><span class="field-label">Name:</span><span class="field-val">Dr. {{Doctor.Name}}</span></div>
            <div class="field-row"><span class="field-label">Specialty:</span><span class="field-val">{{Doctor.Specialization}}</span></div>
            <div class="field-row"><span class="field-label">Reg No:</span><span class="field-val">{{Doctor.RegistrationNumber}}</span></div>
            <div class="field-row"><span class="field-label">Dept.:</span><span class="field-val">{{OPD.Department}}</span></div>
            <div class="field-row"><span class="field-label">Fee Paid:</span><span class="field-val" style="color: #059669;">{{OPD.Fee}}</span></div>
        </div>
    </div>
    <div class="complaints-box">
        <div class="complaints-title">Chief Complaints / Symptoms:</div>
        <div class="complaints-text">{{OPD.Symptoms}}</div>
    </div>
    <div class="footer-row">
        <div class="footer-note">
            Please present this slip to the consulting physician. Printed at {{hospitalName}}.
        </div>
        <div class="signature-box">
            <div style="font-size: 8.5px; font-weight: bold; color: #334155;">Dr. {{Doctor.Name}}</div>
            <div class="sig-line">Authorized Signature</div>
        </div>
    </div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "OPD_PRESCRIPTION") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OPD Consultation Slip</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
        }
        body {
            background: #fff;
            color: #000;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 12mm;
            margin: auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .hospital {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
        }
        .hospital-info h2 {
            font-size: 24px;
            margin-bottom: 4px;
        }
        .hospital-info p {
            font-size: 12px;
            line-height: 1.4;
        }
        .doctor {
            text-align: right;
            margin-top: 5px;
        }
        .doctor h3 {
            font-size: 18px;
            margin-bottom: 4px;
        }
        .doctor p {
            font-size: 13px;
            line-height: 1.4;
        }
        .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 18px;
        }
        .details {
            font-size: 14px;
            margin-bottom: 15px;
        }
        .row {
            display: flex;
            gap: 70px;
            margin-bottom: 10px;
        }
        .field {
            width: 320px;
        }
        .rx {
            font-size: 42px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .prescription {
            height: 500px;
            border: 1px solid #000;
            padding: 12px;
            background:
                repeating-linear-gradient(to bottom,
                    transparent,
                    transparent 27px,
                    #d8d8d8 28px);
        }
        .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        .left {
            width: 65%;
        }
        .left p {
            margin-bottom: 18px;
        }
        .line {
            border-bottom: 1px solid #000;
            height: 24px;
        }
        .signature {
            width: 200px;
            text-align: center;
            align-self: flex-end;
        }
        .sign-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 6px;
        }
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="hospital">
                <img src="{{Hospital.LogoUrl}}" class="logo" onerror="this.style.display='none'">
                <div class="hospital-info">
                    <h2>{{Hospital.Name}}</h2>
                    <p>{{Hospital.Address}}</p>
                    <p>Phone : {{Hospital.Phone}}</p>
                    <p>Email : {{Hospital.Email}}</p>
                </div>
            </div>
            <div class="doctor">
                <h3>{{Doctor.Name}}</h3>
                <p>{{OPD.Department}}</p>
            </div>
        </div>
        <div class="title">
            OPD CONSULTATION SLIP
        </div>
        <div class="details">
            <div class="row">
                <div class="field">
                    <strong>UHID :</strong> {{Patient.UHID}}
                </div>
                <div class="field">
                    <strong>Date :</strong> {{OPD.Date}}
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <strong>Patient :</strong> {{Patient.Name}}
                </div>
                <div class="field">
                    <strong>Age / Sex :</strong> {{Patient.Age}} / {{Patient.Gender}}
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <strong>Mobile :</strong> {{Patient.Phone}}
                </div>
                <div class="field">
                    <strong>Address :</strong> {{Patient.Address}}
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <strong>Payment Status :</strong> <span style="color: #10b981; font-weight: bold;">Paid</span>
                </div>
                <div class="field">
                    <strong>Symptoms / Complaints :</strong> {{OPD.Symptoms}}
                </div>
            </div>
        </div>
        <div class="rx">
            ℞
        </div>
        <div class="prescription">
        </div>
        <div class="footer">
            <div class="left">
                <p>
                    <strong>Diagnosis</strong>
                <div class="line"></div>
                </p>
                <p>
                    <strong>Follow-up</strong>
                <div class="line"></div>
                </p>
            </div>
            <div class="signature">
                <div class="sign-line">
                    Doctor Signature
                </div>
            </div>
        </div>
    </div>
</body>
</html>`.trim()
    };
  }
  // Common standard layouts: Header, Logo, Barcode, Patient Details card, Footer
  const baseComponents: LayoutComponent[] = [
    // Header Logo Placeholder
    { id: "base_logo", type: "Logo", x: 5, y: 2, w: 12, h: 8, visible: true },
    // Hospital Branding Title
    {
      id: "base_h_name",
      type: "DynamicField",
      fieldName: "Hospital.Name",
      x: 19,
      y: 2,
      w: 60,
      h: 4,
      fontSize: 16,
      bold: true,
      align: "left",
      color: "#0f172a",
    },
    // Hospital Branding details
    {
      id: "base_h_contact",
      type: "Text",
      content: "Phone: {{Hospital.Phone}} | Email: {{Hospital.Email}}\nAddress: {{Hospital.Address}}",
      x: 19,
      y: 6,
      w: 60,
      h: 5,
      fontSize: 8,
      align: "left",
      color: "#475569",
    },
    // Document Unique Barcode (Auto-generated UUIDs/IDs)
    { id: "base_barcode", type: "Barcode", x: 81, y: 2, w: 14, h: 7, visible: true },
    // Divider line
    { id: "base_divider_1", type: "Line", x: 5, y: 12, w: 90, h: 0.5, borderColor: "#cbd5e1", borderWidth: 1 },
    // Document Title
    {
      id: "base_doc_title",
      type: "Text",
      content: getDocumentTitle(type),
      x: 5,
      y: 13.5,
      w: 90,
      h: 4,
      fontSize: 13,
      bold: true,
      align: "center",
      color: "#0f172a",
    },
    // Patient Profile Box Rectangle
    {
      id: "base_patient_box",
      type: "Rectangle",
      x: 5,
      y: 18,
      w: 90,
      h: 12,
      borderColor: "#e2e8f0",
      borderWidth: 1,
    },
    // Patient demographic fields
    { id: "lbl_pat_name", type: "Text", content: "Patient Name:", x: 7, y: 19.5, w: 12, h: 2.5, fontSize: 9, bold: true },
    { id: "val_pat_name", type: "DynamicField", fieldName: "Patient.Name", x: 20, y: 19.5, w: 25, h: 2.5, fontSize: 9 },

    { id: "lbl_pat_uhid", type: "Text", content: "UHID:", x: 52, y: 19.5, w: 10, h: 2.5, fontSize: 9, bold: true },
    { id: "val_pat_uhid", type: "DynamicField", fieldName: "Patient.UHID", x: 63, y: 19.5, w: 28, h: 2.5, fontSize: 9 },

    { id: "lbl_pat_age", type: "Text", content: "Age / Gender:", x: 7, y: 22.5, w: 12, h: 2.5, fontSize: 9, bold: true },
    { id: "val_pat_age", type: "Text", content: "{{Patient.Age}} Years / {{Patient.Gender}}", x: 20, y: 22.5, w: 25, h: 2.5, fontSize: 9 },

    { id: "lbl_pat_phone", type: "Text", content: "Phone Number:", x: 52, y: 22.5, w: 10, h: 2.5, fontSize: 9, bold: true },
    { id: "val_pat_phone", type: "DynamicField", fieldName: "Patient.Phone", x: 63, y: 22.5, w: 28, h: 2.5, fontSize: 9 },

    { id: "lbl_pat_date", type: "Text", content: "Date:", x: 7, y: 25.5, w: 12, h: 2.5, fontSize: 9, bold: true },
    { id: "val_pat_date", type: "Date", x: 20, y: 25.5, w: 25, h: 2.5, fontSize: 9 },

    { id: "lbl_pat_doc", type: "Text", content: "Physician:", x: 52, y: 25.5, w: 10, h: 2.5, fontSize: 9, bold: true },
    { id: "val_pat_doc", type: "DynamicField", fieldName: "Doctor.Name", x: 63, y: 25.5, w: 28, h: 2.5, fontSize: 9 },

    // Separator line
    { id: "base_divider_2", type: "Line", x: 5, y: 31.5, w: 90, h: 0.5, borderColor: "#e2e8f0", borderWidth: 1 },
  ];

  const bodyComponents = getDocumentSpecificComponents(type);

  // If the document-specific layout is a raw HTML template, return it directly
  // without merging base/footer canvas components
  if (!Array.isArray(bodyComponents)) {
    return bodyComponents;
  }

  const footerComponents: LayoutComponent[] = [
    // Watermark
    {
      id: "base_watermark",
      type: "Text",
      content: "CONFIDENTIAL - BALAJI HOSPITAL",
      x: 10,
      y: 50,
      w: 80,
      h: 10,
      fontSize: 22,
      color: "#e2e8f0",
      align: "center",
      bold: true,
      visible: true,
    },
    // Doctor signature placeholders
    { id: "sig_doctor", type: "Signature", content: "Doctor's Signature", x: 10, y: 84, w: 25, h: 5, visible: true },
    // Authorized Signatory
    { id: "sig_auth", type: "Signature", content: "Authorized Signatory", x: 65, y: 84, w: 25, h: 5, visible: true },
    // QR Code verifying digital certificate
    { id: "base_qr", type: "QRCode", x: 46, y: 82, w: 8, h: 8, visible: true },
    // Footer separator line
    { id: "base_divider_footer", type: "Line", x: 5, y: 92, w: 90, h: 0.5, borderColor: "#e2e8f0", borderWidth: 1 },
    // Standard disclaimer text
    {
      id: "base_disclaimer",
      type: "Text",
      content: "Disclaimer: This is a system-generated document and does not require a physical signature.",
      x: 5,
      y: 93.5,
      w: 70,
      h: 3,
      fontSize: 7,
      color: "#94a3b8",
    },
    // Page numbering
    { id: "base_page_num", type: "PageNumber", x: 80, y: 93.5, w: 15, h: 3, fontSize: 8, align: "right" },
  ];

  return {
    width: 100,
    height: 100,
    components: [...baseComponents, ...bodyComponents, ...footerComponents],
  };
}

export function getDocumentTitle(type: string): string {
  const titles: Record<string, string> = {
    OPD_REGISTRATION_SLIP: "OPD REGISTRATION SLIP",
    OPD_PRESCRIPTION: "OPD CLINICAL PRESCRIPTION",
    IPD_ADMISSION_FORM: "IPD INPATIENT ADMISSION SLIP",
    IPD_BED_SLIP: "IPD BED ALLOCATION SLIP",
    DISCHARGE_SUMMARY: "CLINICAL DISCHARGE SUMMARY",
    HOSPITAL_INVOICE: "HOSPITAL INVOICE",
    PAYMENT_RECEIPT: "PAYMENT RECEIPT",
    NO_DUE_CERTIFICATE: "NO DUE CLEARANCE CERTIFICATE",
    BIRTH_CERTIFICATE: "VITAL BIRTH CERTIFICATE",
    DEATH_CERTIFICATE: "VITAL DEATH CERTIFICATE",
    LABORATORY_SAMPLE_SLIP: "LABORATORY SAMPLE SLIP",
    LABORATORY_REPORT: "LABORATORY REPORT",
    RADIOLOGY_REQUEST_SLIP: "RADIOLOGY REQUEST SLIP",
    RADIOLOGY_REPORT: "RADIOLOGY REPORT",
    OT_BOOKING_SLIP: "OT BOOKING SLIP",
    OT_SUMMARY: "OPERATION THEATRE CLINICAL SUMMARY",
    PHARMACY_INVOICE: "PHARMACY SALE INVOICE",
    PHARMACY_RETURN_SLIP: "PHARMACY RETURN CREDIT NOTE",
    APPOINTMENT_SLIP: "PATIENT APPOINTMENT SLIP",
    MEDICAL_CERTIFICATE: "MEDICAL FITNESS/LEAVE CERTIFICATE",
    // 15 extra defaults
    CONSENT_FORM: "PATIENT INFORMED CONSENT FORM",
    REFERRAL_LETTER: "CLINICAL REFERRAL LETTER",
    SICK_LEAVE_CERTIFICATE: "SICK LEAVE CERTIFICATE",
    FITNESS_CERTIFICATE: "MEDICAL FITNESS CERTIFICATE",
    VACCINATION_CARD: "PATIENT IMMUNIZATION VACCINATION CARD",
    EMERGENCY_SLIP: "EMERGENCY SERVICES ADMISSION SLIP",
    PHARMACY_PRESCRIPTION_COPY: "PHARMACY PRESCRIPTION COPY",
    OT_CONSENT: "SURGICAL OPERATION INFORMED CONSENT",
    NURSING_NOTES: "CLINICAL NURSING CHART NOTES",
    ICU_CHART: "ICU DAILY PARAMETERS CHART",
    BLOOD_BANK_REQUEST: "BLOOD BANK REQUISITION SLIP",
    BLOOD_ISSUE_SLIP: "BLOOD ISSUING & CROSSMATCH SLIP",
    INSURANCE_CLAIM_FORM: "TPA INSURANCE CLAIM PRE-AUTH FORM",
    DIET_SHEET: "PATIENT DIETARY & NUTRITIONAL SHEET",
    FOLLOW_UP_CARD: "PATIENT FOLLOW-UP CARD & APPOINTMENTS",
  };
  return titles[type] || "HOSPITAL DOCUMENT";
}

function getDocumentSpecificComponents(type: string): LayoutComponent[] | PrintTemplateLayout {
  if (type === "OPD_REGISTRATION_SLIP") {
    return [
      { id: "lbl_opd_id", type: "Text", content: "OPD Encounter ID:", x: 5, y: 34, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_opd_id", type: "DynamicField", fieldName: "OPD.ID", x: 26, y: 34, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_opd_dept", type: "Text", content: "Department:", x: 5, y: 38, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_opd_dept", type: "DynamicField", fieldName: "OPD.Department", x: 26, y: 38, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_opd_fee", type: "Text", content: "Fee Paid:", x: 5, y: 42, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_opd_fee", type: "DynamicField", fieldName: "OPD.Fee", x: 26, y: 42, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_opd_doc", type: "Text", content: "Physician Name:", x: 5, y: 46, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_opd_doc", type: "DynamicField", fieldName: "Doctor.Name", x: 26, y: 46, w: 30, h: 3, fontSize: 10 },

      // Queue number large banner
      { id: "que_box", type: "Rectangle", x: 60, y: 34, w: 35, h: 15, borderColor: "#10b981", borderWidth: 2 },
      { id: "que_lbl", type: "Text", content: "QUEUE TOKEN", x: 60, y: 35.5, w: 35, h: 2, fontSize: 9, bold: true, align: "center", color: "#10b981" },
      { id: "que_val", type: "DynamicField", fieldName: "OPD.Token", x: 60, y: 39, w: 35, h: 6, fontSize: 24, bold: true, align: "center", color: "#047857" },

      { id: "lbl_symptom", type: "Text", content: "Symptoms & Remarks:", x: 5, y: 52, w: 90, h: 3, fontSize: 10, bold: true },
      { id: "val_symptom", type: "DynamicField", fieldName: "OPD.Symptoms", x: 5, y: 56, w: 90, h: 10, fontSize: 10 },
    ];
  }

  if (type === "OPD_PRESCRIPTION" || type === "PHARMACY_PRESCRIPTION_COPY") {
    return [
      { id: "lbl_vitals", type: "Text", content: "Vitals: Temp 98.6 F | BP 120/80 mmHg | Pulse 72 bpm | SpO2 98%", x: 5, y: 34, w: 90, h: 3, fontSize: 9, bold: true, color: "#475569" },
      { id: "lbl_complaints", type: "Text", content: "Chief Complaints / Diagnosis Notes:", x: 5, y: 38, w: 90, h: 3, fontSize: 10, bold: true },
      { id: "val_complaints", type: "Text", content: "Patient reports general weakness, body ache and mild fever for 3 days.\nAdvised blood work and symptomatic treatment.", x: 5, y: 42, w: 90, h: 6, fontSize: 9, color: "#334155" },
      { id: "rx_symbol", type: "Text", content: "Rx", x: 5, y: 49, w: 10, h: 4, fontSize: 18, bold: true, color: "#0f172a" },
      {
        id: "med_table",
        type: "Table",
        x: 5,
        y: 54,
        w: 90,
        h: 20,
        columns: [
          { header: "Medicine Name & Batch", field: "name", w: 40 },
          { header: "Dose", field: "dose", w: 12 },
          { header: "Frequency", field: "freq", w: 12 },
          { header: "Timing", field: "timing", w: 12 },
          { header: "Duration", field: "duration", w: 12 },
          { header: "Qty", field: "qty", w: 12 },
        ],
      },
      { id: "lbl_advice", type: "Text", content: "Advice / Follow up:", x: 5, y: 76, w: 90, h: 3, fontSize: 9, bold: true },
      { id: "val_advice", type: "Text", content: "Drink plenty of fluids. Take light diet. Follow up next Tuesday or if symptoms worsen.", x: 5, y: 79, w: 90, h: 4, fontSize: 8.5, color: "#475569" }
    ];
  }

  if (type === "IPD_ADMISSION_FORM") {
    return [
      { id: "lbl_adm_num", type: "Text", content: "Admission Number:", x: 5, y: 34, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_adm_num", type: "DynamicField", fieldName: "IPD.ID", x: 26, y: 34, w: 30, h: 3, fontSize: 9 },
      { id: "lbl_adm_date", type: "Text", content: "Admission Date:", x: 5, y: 38, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_adm_date", type: "DynamicField", fieldName: "IPD.AdmissionDate", x: 26, y: 38, w: 30, h: 3, fontSize: 9 },
      { id: "lbl_adm_loc", type: "Text", content: "Ward / Room / Bed:", x: 5, y: 42, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_adm_loc", type: "Text", content: "Ward: {{IPD.Ward}} | Room: {{IPD.Room}} | Bed: {{IPD.Bed}}", x: 26, y: 42, w: 65, h: 3, fontSize: 9 },
      { id: "lbl_adm_ins", type: "Text", content: "Insurance:", x: 5, y: 46, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_adm_ins", type: "DynamicField", fieldName: "IPD.Insurance", x: 26, y: 46, w: 30, h: 3, fontSize: 9 },
      { id: "lbl_adm_diag", type: "Text", content: "Preliminary Diagnosis:", x: 5, y: 50, w: 25, h: 3, fontSize: 9, bold: true },
      { id: "val_adm_diag", type: "Text", content: "Required inpatient evaluation and continuous vitals monitoring", x: 31, y: 50, w: 60, h: 3, fontSize: 9 },
      { id: "lbl_consent", type: "Text", content: "Consent Status:", x: 5, y: 54, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_consent", type: "Text", content: "GIVEN & SIGNED (Admission Consent & General Treatment)", x: 26, y: 54, w: 65, h: 3, fontSize: 9, color: "#10b981", bold: true }
    ];
  }

  if (type === "IPD_BED_SLIP") {
    return [
      { id: "lbl_bed_name", type: "Text", content: "Patient Name:", x: 5, y: 34, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_bed_name", type: "DynamicField", fieldName: "Patient.Name", x: 26, y: 34, w: 65, h: 3, fontSize: 10, bold: true },
      { id: "lbl_bed_loc", type: "Text", content: "Location:", x: 5, y: 39, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_bed_loc", type: "Text", content: "Ward {{IPD.Ward}} - Room {{IPD.Room}} - Bed {{IPD.Bed}}", x: 26, y: 39, w: 65, h: 3, fontSize: 10 },
      { id: "lbl_bed_doc", type: "Text", content: "Consultant:", x: 5, y: 44, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_bed_doc", type: "DynamicField", fieldName: "Doctor.Name", x: 26, y: 44, w: 65, h: 3, fontSize: 10 },
      { id: "lbl_bed_date", type: "Text", content: "Admission Date:", x: 5, y: 49, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_bed_date", type: "DynamicField", fieldName: "IPD.AdmissionDate", x: 26, y: 49, w: 65, h: 3, fontSize: 10 },
      { id: "lbl_bed_blood", type: "Text", content: "Blood Group / Allergies:", x: 5, y: 54, w: 30, h: 3, fontSize: 10, bold: true, color: "#ef4444" },
      { id: "val_bed_blood", type: "Text", content: "Group: N/A | Allergies: No Known Drug Allergies (NKDA)", x: 36, y: 54, w: 55, h: 3, fontSize: 10, color: "#ef4444" }
    ];
  }

  if (type === "DISCHARGE_SUMMARY") {
    return [
      { id: "lbl_dis_det", type: "Text", content: "Encounter Details:", x: 5, y: 34, w: 20, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dis_det", type: "Text", content: "IPD ID: {{IPD.ID}} | Admitted: {{IPD.AdmissionDate}} | Discharged: {{IPD.DischargeDate}}", x: 26, y: 34, w: 65, h: 2.5, fontSize: 9 },
      { id: "lbl_dis_diag", type: "Text", content: "Final Discharge/ICD Code:", x: 5, y: 37.5, w: 20, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dis_diag", type: "DynamicField", fieldName: "IPD.Diagnosis", x: 26, y: 37.5, w: 65, h: 2.5, fontSize: 9 },
      { id: "lbl_dis_proc", type: "Text", content: "Procedures Done:", x: 5, y: 41, w: 20, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dis_proc", type: "DynamicField", fieldName: "IPD.ChiefComplaints", x: 26, y: 41, w: 65, h: 2.5, fontSize: 9 },
      { id: "lbl_dis_treat", type: "Text", content: "Treatment Summary:", x: 5, y: 44.5, w: 20, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dis_treat", type: "DynamicField", fieldName: "IPD.Treatment", x: 26, y: 44.5, w: 65, h: 4, fontSize: 9, color: "#334155" },
      { id: "lbl_dis_meds", type: "Text", content: "Discharge Medicines:", x: 5, y: 49.5, w: 25, h: 2.5, fontSize: 9, bold: true, color: "#10b981" },
      { id: "val_dis_meds", type: "DynamicField", fieldName: "IPD.ClinicalSummary", x: 5, y: 53, w: 90, h: 14, fontSize: 9 },
      { id: "lbl_dis_cond", type: "Text", content: "Condition at Discharge:", x: 5, y: 68, w: 30, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dis_cond", type: "DynamicField", fieldName: "IPD.Condition", x: 36, y: 68, w: 55, h: 2.5, fontSize: 9 },
      { id: "lbl_dis_follow", type: "Text", content: "Follow-up Instructions:", x: 5, y: 71.5, w: 30, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dis_follow", type: "DynamicField", fieldName: "IPD.Advice", x: 36, y: 71.5, w: 55, h: 2.5, fontSize: 9 }
    ];
  }

  if (type === "HOSPITAL_INVOICE" || type === "PHARMACY_INVOICE") {
    return [
      { id: "lbl_inv_num", type: "Text", content: "Invoice Number:", x: 5, y: 34, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_inv_num", type: "DynamicField", fieldName: "Invoice.Number", x: 26, y: 34, w: 30, h: 3, fontSize: 9 },
      {
        id: "bill_table",
        type: "Table",
        x: 5,
        y: 40,
        w: 90,
        h: 26,
        columns: [
          { header: "Service / Particulars Item Description", field: "name", w: 45 },
          { header: "Qty", field: "qty", w: 10 },
          { header: "Rate", field: "rate", w: 15 },
          { header: "Discount", field: "discount", w: 15 },
          { header: "Amount", field: "total", w: 15 },
        ],
      },
      { id: "lbl_gross", type: "Text", content: "Gross Total:", x: 60, y: 68, w: 20, h: 2.5, fontSize: 9, bold: true, align: "right" },
      { id: "val_gross", type: "DynamicField", fieldName: "Invoice.Gross", x: 81, y: 68, w: 14, h: 2.5, fontSize: 9, align: "right" },
      { id: "lbl_disc", type: "Text", content: "Discount Applied:", x: 60, y: 71, w: 20, h: 2.5, fontSize: 9, bold: true, align: "right" },
      { id: "val_disc", type: "DynamicField", fieldName: "Invoice.Discount", x: 81, y: 71, w: 14, h: 2.5, fontSize: 9, align: "right" },
      { id: "lbl_tax", type: "Text", content: "GST / Taxes:", x: 60, y: 74, w: 20, h: 2.5, fontSize: 9, bold: true, align: "right" },
      { id: "val_tax", type: "DynamicField", fieldName: "Invoice.Tax", x: 81, y: 74, w: 14, h: 2.5, fontSize: 9, align: "right" },
      { id: "lbl_net", type: "Text", content: "Net Balance Due:", x: 60, y: 77, w: 20, h: 2.5, fontSize: 10, bold: true, align: "right", color: "#047857" },
      { id: "val_net", type: "DynamicField", fieldName: "Invoice.Net", x: 81, y: 77, w: 14, h: 2.5, fontSize: 10, bold: true, align: "right", color: "#047857" },
    ];
  }

  if (type === "PAYMENT_RECEIPT" || type === "PHARMACY_RETURN_SLIP") {
    return [
      { id: "lbl_rcpt_num", type: "Text", content: "Receipt Number:", x: 5, y: 34, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_rcpt_num", type: "DynamicField", fieldName: "Receipt.Number", x: 26, y: 34, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_inv_ref", type: "Text", content: "Invoice Ref Number:", x: 5, y: 38, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_inv_ref", type: "DynamicField", fieldName: "Invoice.Number", x: 26, y: 38, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_pay_mode", type: "Text", content: "Payment Mode:", x: 5, y: 42, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_pay_mode", type: "DynamicField", fieldName: "Receipt.PaymentMode", x: 26, y: 42, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_utr", type: "Text", content: "UTR / Transaction Ref:", x: 5, y: 46, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_utr", type: "DynamicField", fieldName: "Receipt.UTR", x: 26, y: 46, w: 30, h: 3, fontSize: 10 },
      { id: "amt_box", type: "Rectangle", x: 5, y: 52, w: 90, h: 14, borderColor: "#cbd5e1" },
      { id: "lbl_amt", type: "Text", content: "AMOUNT TRANSACTED SUCCESSFULLY", x: 5, y: 54, w: 90, h: 2.5, fontSize: 9, bold: true, align: "center", color: "#64748b" },
      { id: "val_amt", type: "DynamicField", fieldName: "Receipt.Amount", x: 5, y: 57.5, w: 90, h: 6, fontSize: 22, bold: true, align: "center", color: "#047857" },
    ];
  }

  if (type === "NO_DUE_CERTIFICATE") {
    return {
      isRawHtml: true,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>No Dues Clearance Certificate</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family: Arial, Helvetica, sans-serif;
}
body{
    padding:12mm;
    background:#fff;
    color: #1e293b;
}
.page {
    width: 100%;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px double #cbd5e1;
    padding-bottom: 12px;
    margin-bottom: 20px;
}
.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}
.logo-box {
    width: 48px;
    height: 48px;
    background: #0f766e;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-size: 24px;
}
.brand-info h1 {
    font-size: 20px;
    font-weight: 900;
    color: #115e59;
    letter-spacing: -0.5px;
}
.brand-info p {
    font-size: 10px;
    color: #64748b;
}
.brand-info span {
    font-size: 8px;
    color: #94a3b8;
}
.title-block {
    text-align: right;
}
.title-block h2 {
    font-size: 14px;
    font-weight: 800;
    color: #0f766e;
}
.title-block p {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
}
.cert-body {
    margin-top: 20px;
}
.cert-text {
    font-size: 14px;
    line-height: 1.6;
    color: #334155;
    text-align: justify;
    margin-bottom: 25px;
}
.highlight {
    font-weight: bold;
    color: #0f172a;
}
.demographics-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
}
.demographics-table td {
    padding: 8px 12px;
    font-size: 12px;
    border: 1px solid #e2e8f0;
}
.demographics-table td.label {
    background: #f8fafc;
    font-weight: bold;
    color: #64748b;
    width: 25%;
}
.demographics-table td.val {
    color: #1e293b;
    font-weight: 600;
    width: 25%;
}
.clearance-grid {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    margin-bottom: 30px;
}
.clearance-grid th, .clearance-grid td {
    border: 1px solid #e2e8f0;
    padding: 10px 15px;
    font-size: 12px;
}
.clearance-grid th {
    background: #f1f5f9;
    text-align: left;
    font-weight: bold;
    color: #475569;
}
.clearance-grid td.dept {
    font-weight: bold;
    color: #1e293b;
}
.clearance-grid td.status {
    font-weight: bold;
    color: #0d9488;
}
.footer {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}
.footer-note {
    font-size: 10px;
    color: #94a3b8;
    width: 50%;
}
.signatures {
    display: flex;
    gap: 30px;
}
.signature-box {
    text-align: center;
    width: 120px;
}
.sig-line {
    border-top: 1px solid #cbd5e1;
    margin-top: 45px;
    padding-top: 4px;
    font-size: 10px;
    font-weight: bold;
    color: #64748b;
    text-transform: uppercase;
}
@page {
    size: A4 portrait;
    margin: 12mm;
}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="brand">
            <div class="logo-box">+</div>
            <div class="brand-info">
                <h1>{{hospitalName}}</h1>
                <p>Multi-Speciality Care & Clinical Research</p>
                <span>Contact: {{hospitalEmail}} | Phone: {{hospitalPhone}}</span>
            </div>
        </div>
        <div class="title-block">
            <h2>NO DUES CERTIFICATE</h2>
            <p>Date: {{currentDate}}</p>
        </div>
    </div>
    
    <div class="cert-body">
        <p class="cert-text">
            This is to certify that the patient <span class="highlight">{{Patient.Name}}</span>, bearing UHID <span class="highlight" style="font-family: monospace;">{{Patient.UHID}}</span>, admitted under IPD/Admission No. <span class="highlight">{{IPD.ID}}</span>, has settled all outstanding bills and expenses. There are no pending dues or claims against this patient across any department of the hospital.
        </p>
        
        <table class="demographics-table">
            <tr>
                <td class="label">Patient Name</td>
                <td class="val">{{Patient.Name}}</td>
                <td class="label">UHID</td>
                <td class="val" style="font-family: monospace;">{{Patient.UHID}}</td>
            </tr>
            <tr>
                <td class="label">Age / Gender</td>
                <td class="val">{{Patient.Age}} Yrs / {{Patient.Gender}}</td>
                <td class="label">Admission ID</td>
                <td class="val">{{IPD.ID}}</td>
            </tr>
            <tr>
                <td class="label">Admission Date</td>
                <td class="val">{{IPD.AdmissionDate}}</td>
                <td class="label">Discharge Date</td>
                <td class="val">{{IPD.DischargeDate}}</td>
            </tr>
        </table>
        
        <h3 style="font-size: 13px; font-weight: bold; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Departmental Clearance Check</h3>
        <table class="clearance-grid">
            <thead>
                <tr>
                    <th>Department / Service Area</th>
                    <th>Clearance Status</th>
                    <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="dept">Inpatient Billing & Operations</td>
                    <td class="status">CLEARED</td>
                    <td>Invoice fully paid & closed</td>
                </tr>
                <tr>
                    <td class="dept">Hospital Pharmacy (Medications)</td>
                    <td class="status">CLEARED</td>
                    <td>All dispensed medications billed</td>
                </tr>
                <tr>
                    <td class="dept">Laboratory & Diagnostics</td>
                    <td class="status">CLEARED</td>
                    <td>All tests and reports reconciled</td>
                </tr>
                <tr>
                    <td class="dept">Nursing & Ward Services</td>
                    <td class="status">CLEARED</td>
                    <td>Room charge & consumables verified</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <div class="footer-note">
            * This document is generated electronically as verification of clearance. For any queries, contact the billing desk.
        </div>
        <div class="signatures">
            <div class="signature-box">
                <div class="sig-line">Billing Executive</div>
            </div>
            <div class="signature-box">
                <div class="sig-line">Medical Admin</div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`.trim()
    };
  }

  if (type === "BIRTH_CERTIFICATE") {
    return [
      { id: "lbl_b_cert", type: "Text", content: "Certificate No:", x: 5, y: 34, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_b_cert", type: "DynamicField", fieldName: "Birth.CertificateNumber", x: 26, y: 34, w: 30, h: 3, fontSize: 9 },
      { id: "cert_box", type: "Rectangle", x: 5, y: 39, w: 90, h: 38, borderColor: "#cbd5e1" },
      { id: "cert_p1", type: "Text", content: "This is to certify that the child whose details are recorded below was born in Balaji Hospital", x: 10, y: 42, w: 80, h: 4, fontSize: 10, align: "center" },
      { id: "lbl_baby_name", type: "Text", content: "Baby Name:", x: 15, y: 48, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_baby_name", type: "DynamicField", fieldName: "Birth.BabyName", x: 42, y: 48, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_baby_gender", type: "Text", content: "Gender:", x: 15, y: 52, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_baby_gender", type: "DynamicField", fieldName: "Birth.Gender", x: 42, y: 52, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_baby_dob", type: "Text", content: "Date & Time of Birth:", x: 15, y: 56, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_baby_dob", type: "DynamicField", fieldName: "Birth.Dob", x: 42, y: 56, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_mother", type: "Text", content: "Mother's Name:", x: 15, y: 60, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_mother", type: "DynamicField", fieldName: "Birth.MotherName", x: 42, y: 60, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_father", type: "Text", content: "Father's Name:", x: 15, y: 64, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_father", type: "DynamicField", fieldName: "Birth.FatherName", x: 42, y: 64, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_weight", type: "Text", content: "Birth Weight (Kg):", x: 15, y: 68, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_weight", type: "DynamicField", fieldName: "Birth.BirthWeight", x: 42, y: 68, w: 45, h: 2.5, fontSize: 9 },
    ];
  }

  if (type === "DEATH_CERTIFICATE") {
    return [
      { id: "lbl_d_cert", type: "Text", content: "Certificate No:", x: 5, y: 34, w: 20, h: 3, fontSize: 9, bold: true },
      { id: "val_d_cert", type: "DynamicField", fieldName: "Death.CertificateNumber", x: 26, y: 34, w: 30, h: 3, fontSize: 9 },
      { id: "cert_box_d", type: "Rectangle", x: 5, y: 39, w: 90, h: 38, borderColor: "#cbd5e1" },
      { id: "cert_p1_d", type: "Text", content: "This is to certify that the patient recorded below expired in Balaji Hospital", x: 10, y: 42, w: 80, h: 4, fontSize: 10, align: "center" },
      { id: "lbl_dec_name", type: "Text", content: "Deceased Name:", x: 15, y: 48, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dec_name", type: "DynamicField", fieldName: "Patient.Name", x: 42, y: 48, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_dec_age", type: "Text", content: "Age / Gender:", x: 15, y: 52, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_dec_age", type: "Text", content: "{{Patient.Age}} Years / {{Patient.Gender}}", x: 42, y: 52, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_death_date", type: "Text", content: "Date & Time of Death:", x: 15, y: 56, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_death_date", type: "DynamicField", fieldName: "Death.Date", x: 42, y: 56, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_death_cause", type: "Text", content: "Primary Cause of Death:", x: 15, y: 60, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_death_cause", type: "DynamicField", fieldName: "Death.Cause", x: 42, y: 60, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_informant", type: "Text", content: "Informant / Attendant:", x: 15, y: 64, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_informant", type: "DynamicField", fieldName: "Death.Informant", x: 42, y: 64, w: 45, h: 2.5, fontSize: 9 },
    ];
  }

  if (type === "LABORATORY_SAMPLE_SLIP") {
    return [
      { id: "lbl_labs_id", type: "Text", content: "Sample Barcode ID:", x: 5, y: 34, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_labs_id", type: "DynamicField", fieldName: "Patient.UHID", x: 31, y: 34, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_labs_test", type: "Text", content: "Investigations:", x: 5, y: 39, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_labs_test", type: "Text", content: "Laboratory Hematology / Biochemistry panel tests", x: 31, y: 39, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_labs_type", type: "Text", content: "Sample Type:", x: 5, y: 44, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_labs_type", type: "Text", content: "Venous Blood (EDTA/Fluoride) / Urine Sample", x: 31, y: 44, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_labs_time", type: "Text", content: "Collection Time:", x: 5, y: 49, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_labs_time", type: "Date", x: 31, y: 49, w: 30, h: 3, fontSize: 10 },
      { id: "labs_barcode", type: "Barcode", x: 35, y: 58, w: 30, h: 14 }
    ];
  }

  if (type === "LABORATORY_REPORT" || type === "RADIOLOGY_REPORT") {
    return [
      { id: "lbl_test_name", type: "Text", content: "Investigations Performed:", x: 5, y: 34, w: 30, h: 3, fontSize: 10, bold: true },
      { id: "val_test_name", type: "Text", content: "Complete Blood Count (CBC) with differential panel", x: 36, y: 34, w: 59, h: 3, fontSize: 10 },
      {
        id: "results_table",
        type: "Table",
        x: 5,
        y: 40,
        w: 90,
        h: 30,
        columns: [
          { header: "Test Parameter", field: "name", w: 35 },
          { header: "Observed Result", field: "value", w: 20 },
          { header: "Unit", field: "unit", w: 15 },
          { header: "Biological Reference Interval", field: "reference", w: 20 },
          { header: "Flag", field: "flag", w: 10 },
        ],
      },
      { id: "lbl_comments", type: "Text", content: "Clinical Remarks / Impression:", x: 5, y: 72, w: 90, h: 3, fontSize: 9, bold: true },
      { id: "val_comments", type: "Text", content: "Correlate clinically. Findings suggest mild viral etiology.", x: 5, y: 75.5, w: 90, h: 5, fontSize: 8.5, color: "#475569" },
    ];
  }

  if (type === "RADIOLOGY_REQUEST_SLIP") {
    return [
      { id: "lbl_rads_type", type: "Text", content: "Scan Type:", x: 5, y: 34, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_rads_type", type: "Text", content: "Chest X-Ray PA View / USG Whole Abdomen", x: 31, y: 34, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_rads_hist", type: "Text", content: "Clinical History:", x: 5, y: 39, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_rads_hist", type: "Text", content: "Cough with expectoration and mild fever for 1 week.", x: 31, y: 39, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_rads_pri", type: "Text", content: "Priority Status:", x: 5, y: 44, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_rads_pri", type: "Text", content: "ROUTINE / STAT CLINICAL REQUEST", x: 31, y: 44, w: 60, h: 3, fontSize: 10, color: "#eab308", bold: true },
      { id: "lbl_rads_inst", type: "Text", content: "Instructions:", x: 5, y: 49, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_rads_inst", type: "Text", content: "No special preparation required. Remove all metallic objects before scan.", x: 31, y: 49, w: 60, h: 3, fontSize: 10 }
    ];
  }

  if (type === "OT_BOOKING_SLIP") {
    return [
      { id: "lbl_otb_surg", type: "Text", content: "Proposed Surgery:", x: 5, y: 34, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_otb_surg", type: "DynamicField", fieldName: "OT.ProcedureName", x: 31, y: 34, w: 60, h: 3, fontSize: 10, bold: true },
      { id: "lbl_otb_num", type: "Text", content: "OT Room Assigned:", x: 5, y: 38, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_otb_num", type: "Text", content: "Operation Theatre Room No 3 (Level 2)", x: 31, y: 38, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_otb_time", type: "Text", content: "Schedule Time:", x: 5, y: 42, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_otb_time", type: "Date", x: 31, y: 42, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_otb_team", type: "Text", content: "Surgical Team:", x: 5, y: 46, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_otb_team", type: "Text", content: "Surgeon: Dr. Sharma | Assistant: Dr. Verma | Anaesthetist: Dr. Gupta", x: 31, y: 46, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_otb_pri", type: "Text", content: "Priority Status:", x: 5, y: 51, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_otb_pri", type: "Text", content: "ELECTIVE SCHEDULED SURGERY", x: 31, y: 51, w: 60, h: 3, fontSize: 10, color: "#10b981", bold: true }
    ];
  }

  if (type === "OT_SUMMARY") {
    return [
      { id: "lbl_ots_proc", type: "Text", content: "Procedure Performed:", x: 5, y: 34, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_ots_proc", type: "DynamicField", fieldName: "OT.ProcedureName", x: 31, y: 34, w: 60, h: 3, fontSize: 10, bold: true },
      { id: "lbl_ots_find", type: "Text", content: "Intraoperative Findings:", x: 5, y: 38, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_ots_find", type: "Text", content: "Gallbladder was inflamed and filled with multiple small calculi. Successfully dissected.", x: 31, y: 38, w: 60, h: 4, fontSize: 10 },
      { id: "lbl_ots_imp", type: "Text", content: "Implants Used:", x: 5, y: 44, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_ots_imp", type: "Text", content: "None / Titanium Clips x 3 applied", x: 31, y: 44, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_ots_loss", type: "Text", content: "Estimated Blood Loss:", x: 5, y: 48, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_ots_loss", type: "Text", content: "Minimal (Approx 50ml)", x: 31, y: 48, w: 60, h: 3, fontSize: 10 },
      { id: "lbl_ots_comp", type: "Text", content: "Complications:", x: 5, y: 52, w: 25, h: 3, fontSize: 10, bold: true },
      { id: "val_ots_comp", type: "Text", content: "None reported. Patient shifted to post-op recovery room.", x: 31, y: 52, w: 60, h: 3, fontSize: 10, color: "#10b981" }
    ];
  }

  if (type === "APPOINTMENT_SLIP") {
    return [
      { id: "lbl_apt_id", type: "Text", content: "Appointment ID:", x: 5, y: 34, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_apt_id", type: "DynamicField", fieldName: "OPD.ID", x: 26, y: 34, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_apt_doc", type: "Text", content: "Doctor Name:", x: 5, y: 38, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_apt_doc", type: "DynamicField", fieldName: "Doctor.Name", x: 26, y: 38, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_apt_dept", type: "Text", content: "Department:", x: 5, y: 42, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_apt_dept", type: "DynamicField", fieldName: "OPD.Department", x: 26, y: 42, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_apt_date", type: "Text", content: "Schedule Time:", x: 5, y: 46, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_apt_date", type: "Date", x: 26, y: 46, w: 30, h: 3, fontSize: 10 },
      { id: "lbl_apt_token", type: "Text", content: "Token:", x: 5, y: 50, w: 20, h: 3, fontSize: 10, bold: true },
      { id: "val_apt_token", type: "DynamicField", fieldName: "OPD.Token", x: 26, y: 50, w: 30, h: 3, fontSize: 10, bold: true },
      { id: "lbl_apt_inst", type: "Text", content: "Instructions:", x: 5, y: 55, w: 90, h: 3, fontSize: 10, bold: true },
      { id: "val_apt_inst", type: "Text", content: "Please report 15 minutes prior to appointment time. Bring all previous medical records.", x: 5, y: 59, w: 90, h: 8, fontSize: 9, color: "#475569" }
    ];
  }

  if (type === "MEDICAL_CERTIFICATE") {
    return [
      { id: "cert_box_m", type: "Rectangle", x: 5, y: 34, w: 90, h: 42, borderColor: "#cbd5e1" },
      { id: "mc_p1", type: "Text", content: "This is to certify that the patient recorded below was under treatment at Balaji Hospital.", x: 10, y: 37, w: 80, h: 4, fontSize: 10, align: "center" },
      { id: "lbl_mc_diag", type: "Text", content: "Diagnosis / Sickness:", x: 15, y: 44, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_mc_diag", type: "Text", content: "Acute respiratory tract infection with high grade fever", x: 42, y: 44, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_mc_rest", type: "Text", content: "Rest Period Recommended:", x: 15, y: 49, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_mc_rest", type: "Text", content: "Rest of 5 days (from today) is advised for recovery.", x: 42, y: 49, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_mc_purpose", type: "Text", content: "Certificate Purpose:", x: 15, y: 54, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_mc_purpose", type: "Text", content: "Submission to academic institution / employer", x: 42, y: 54, w: 45, h: 2.5, fontSize: 9 },
      { id: "lbl_mc_status", type: "Text", content: "Fitness Status:", x: 15, y: 60, w: 25, h: 2.5, fontSize: 9, bold: true },
      { id: "val_mc_status", type: "Text", content: "RECOMMENDED FIT FOR DUTY POST REST PERIOD", x: 42, y: 60, w: 45, h: 2.5, fontSize: 10, color: "#047857", bold: true }
    ];
  }

  // General default fallback for the remaining documents
  return [
    { id: "lbl_gen_1", type: "Text", content: "Document Reference ID:", x: 5, y: 34, w: 25, h: 3, fontSize: 10, bold: true },
    { id: "val_gen_1", type: "DynamicField", fieldName: "Patient.UHID", x: 31, y: 34, w: 30, h: 3, fontSize: 10 },
    { id: "lbl_gen_2", type: "Text", content: "Description:", x: 5, y: 39, w: 25, h: 3, fontSize: 10, bold: true },
    { id: "val_gen_2", type: "Text", content: "This clinical document contains sensitive medical information. Please verify with hospital staff for any queries.", x: 5, y: 43, w: 90, h: 8, fontSize: 9, color: "#334155" },

    { id: "rect_gen", type: "Rectangle", x: 5, y: 54, w: 90, h: 24, borderColor: "#e2e8f0" },
    { id: "rect_txt", type: "Text", content: "CLINICAL DATA / RECORD CONTAINER", x: 5, y: 64, w: 90, h: 4, fontSize: 12, bold: true, align: "center", color: "#cbd5e1" },
  ];
}
