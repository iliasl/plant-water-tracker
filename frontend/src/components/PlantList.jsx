import React from 'react';
import { ChevronLeft } from 'lucide-react';
import PlantCard from './PlantCard';

const PlantList = ({ room, onBack }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 -ml-2"><ChevronLeft /></button>
        <h2 className="text-2xl font-bold">{room.name}</h2>
      </div>
      <div className="space-y-3">
        {room.plants.map(plant => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>
    </div>
  );
};

export default PlantList;
