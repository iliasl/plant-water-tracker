import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Droplets, Clock, AlertCircle, RotateCcw, Settings, Trash2 } from 'lucide-react';

const HelpPage = () => {
  const navigate = useNavigate();

  const Section = ({ title, icon, children }) => (
    <section className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
        {React.cloneElement(icon, { className: 'w-6 h-6 text-green-600' })}
        {title}
      </h2>
      <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );

  const SubSection = ({ title, children }) => (
    <div className="border-l-4 border-green-200 pl-4 py-2">
      <h3 className="font-bold text-base text-slate-700 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );

  const Code = ({ children }) => <code className="bg-slate-100 text-green-800 font-mono text-xs px-1.5 py-1 rounded-md">{children}</code>;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ChevronLeft /></button>
        <h1 className="text-2xl font-bold">Help Center</h1>
      </div>

      <Section title="The Philosophy" icon={<Droplets />}>
        <p>The goal of PlantWise isn't to tell you *when to water*, but rather **when to check if your plant needs water**.</p>
        <p>Every plant and environment is unique. By checking the soil, you give the plant what it needs, exactly when it needs it. The app's smart scheduling learns *your* plant's specific rhythm.</p>
      </Section>

      <Section title="Core Workflow" icon={<Clock />}>
        <p>The main dashboard lists your plants, sorted by which ones need checking most urgently.</p>
        <SubSection title="Scenario 1: The Soil is Still Wet">
          <p>The plant doesn't need water yet. This is valuable information for the app.</p>
          <p><strong>Action:</strong> Click the <strong>Snooze</strong> button (🕒).</p>
          <p>A popup will appear suggesting a snooze period. You can adjust this based on how wet the soil felt. The plant will move down the list and you'll be reminded later.</p>
        </SubSection>
        <SubSection title="Scenario 2: The Soil is Dry & Ready">
          <p>The plant is thirsty. Time to water it.</p>
          <p><strong>Action:</strong> **Water your plant first!** Then, click the **Water** button (💧).</p>
          <p>A popup will ask how the soil was. You have three choices:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Normal:</strong> The ideal state. The app learns this interval for future predictions.</li>
            <li><strong>Too Dry:</strong> The soil was bone-dry. The app learns, but also shortens the next interval by 20% to avoid this.</li>
            <li><strong>Logged Late:</strong> You forgot to log a watering, or watered late on vacation. This event is recorded but **does not** affect the learned schedule.</li>
          </ul>
        </SubSection>
      </Section>
      
      <Section title="Managing Plants" icon={<RotateCcw />}>
        <SubSection title="Editing a Plant">
            <p>Click on a plant card to open its details page, then find the edit button. Here you can change the name, photo, room, and update the **Water Amount**.</p>
        </SubSection>
        <SubSection title="Repotting or Moving a Plant">
          <p>Big changes (like a new pot or a sunnier spot) can disrupt a plant's schedule.</p>
          <p><strong>Action:</strong> In the "Edit Plant" menu, click the <strong>Repotted</strong> button (🔄).</p>
          <p>This **resets the plant's learned schedule** back to the default for its type. The app will then start learning the new schedule from scratch.</p>
        </SubSection>
      </Section>

      <Section title="Settings & Advanced" icon={<Settings />}>
        <SubSection title="Algorithm Tuning">
          <p>In the <strong>Settings</strong> menu (⚙️), you can fine-tune the learning algorithm:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Adaptability (Alpha):</strong> Controls how quickly the app reacts to new watering intervals. Lower is more stable, Higher is more reactive.</li>
            <li><strong>Snooze Length:</strong> Controls the default snooze suggestion, as a percentage of the learned schedule.</li>
          </ul>
        </SubSection>
        <SubSection title="The Graveyard">
          <p>Accidentally deleted a plant? No worries.</p>
          <p>In <strong>Settings</strong>, you can access the <strong>Plant Graveyard</strong> (🗑️) to view and restore any plants you've previously deleted.</p>
        </SubSection>
      </Section>
    </div>
  );
};

export default HelpPage;
