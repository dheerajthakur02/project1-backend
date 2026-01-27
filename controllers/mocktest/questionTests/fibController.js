import React, { useState } from "react";

export default function FIBRWMockTest({ backendData }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const questions = backendData.questions || [];
  const [answers, setAnswers] = useState({});

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(prev => prev + 1);
    else alert("Test Finished");
  };

  const renderContent = (fullText, dropdownOptions) => {
    // Assuming text has [blank] markers
    const parts = fullText.split("[blank]");
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && (
          <select 
            className="mx-1 border rounded bg-white text-[#008199] px-2 py-1 outline-[#008199] border-gray-300"
            onChange={(e) => setAnswers({ ...answers, [`${currentIdx}-${index}`]: e.target.value })}
          >
            <option value="">Select...</option>
            {dropdownOptions[index].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="bg-[#4d4d4d] text-white px-4 py-2 flex justify-between">
        <span className="text-lg">APEUni Mock Test - FIB RW</span>
        <span className="bg-[#666] px-2 rounded">Question {currentIdx + 1} of {questions.length}</span>
      </div>

      <div className="bg-[#008199] text-white px-6 py-2 text-[13px]">
        Below is a text with blanks. Click on each blank, a list of choices will appear. Select the appropriate answer choice for each blank.
      </div>

      <div className="flex-grow p-12 bg-[#f9f9f9]">
        <div className="max-w-5xl mx-auto bg-white p-12 border shadow-sm leading-[2.5rem] text-[17px] text-gray-800">
          {renderContent(questions[currentIdx]?.fullText, questions[currentIdx]?.options)}
        </div>
      </div>

      <div className="h-14 bg-[#cccccc] flex items-center justify-end px-4">
        <button onClick={handleNext} className="bg-[#008199] text-white px-10 py-1 rounded font-bold uppercase shadow-md">Next</button>
      </div>
    </div>
  );
}