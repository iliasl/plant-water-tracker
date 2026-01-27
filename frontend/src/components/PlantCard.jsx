// Import necessary dependencies from React and other libraries.
import React, { useState, useEffect } from 'react';
import { MoreVertical, Droplets, Clock, AlertCircle, Plus, Minus, AlertTriangle } from 'lucide-react';

// Import utility functions, including one for conditional class naming.
import { cn } from '../lib/utils';
import { formatDistanceToNow, isPast, parseISO, isToday } from 'date-fns';


/**
 * PlantCard component displays a summary of a plant's status and provides actions.
 * @param {object} plant - The plant object with details like name, watering schedule, etc.
 * @param {function} onAction - Callback function to handle actions like watering or snoozing.
 * @param {function} onEdit - Callback function to handle editing the plant's details.
 * @param {function} onView - Callback function to view the plant's details.
 */
const PlantCard = ({ plant, onAction, onEdit, onView }) => {
  // Parse the next check date for the plant.
  const nextDate = plant.nextCheckDate ? parseISO(plant.nextCheckDate) : null;
  // Determine if the plant's watering is overdue.
  const isOverdue = nextDate && !isNaN(nextDate) && isPast(nextDate) && !isToday(nextDate);
  // Determine if the plant needs to be watered today.
  const isCurrentlyToday = nextDate && !isNaN(nextDate) && isToday(nextDate);
  // State to track if an action is being handled.
  const [isHandling, setIsHandling] = useState(false);
  // State to control the visibility of the snooze popup.
  const [showSnoozePopup, setShowSnoozePopup] = useState(false);
  // State to control the visibility of the water popup.
  const [showWaterPopup, setShowWaterPopup] = useState(false);
  // State to manage the number of days to snooze.
  const [snoozeDays, setSnoozeDays] = useState(2);

  // This effect calculates the default snooze duration based on the plant's current EMA (Exponential Moving Average).
  // It ensures the snooze period is a fraction of the watering cycle, with a minimum of 2 days.
  useEffect(() => {
    if (plant.currentEma) {
      setSnoozeDays(Math.max(2, Math.floor(plant.currentEma * 0.2)));
    }
  }, [plant.currentEma]);

  // Format the last watered date into a human-readable string.
  const lastWateredStr = plant.lastWateredDate 
    ? `${formatDistanceToNow(new Date(plant.lastWateredDate))} ago`
    : 'Never';

  /**
   * Handles actions like 'WATER' or 'SNOOZE' for the plant.
   * @param {string} type - The type of action to perform.
   * @param {object} extraData - Additional data for the action, like snooze days or soil condition.
   */
  const handleAction = async (type, extraData = {}) => {
    setIsHandling(true);
    setShowSnoozePopup(false);
    setShowWaterPopup(false);
    await onAction(plant.id, type, false, extraData);
  };

  return (
    // Main container for the plant card, with a click handler to view plant details.
    <div 
      onClick={() => onView(plant)}
      className={cn(
        "bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-3 transition-all relative cursor-pointer",
        isHandling && "grayscale-[0.5] scale-[0.98]"
      )}
    >
      {/* Snooze popup, shown when the user wants to delay the next watering. */}
      {showSnoozePopup && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-white/95 z-20 rounded-xl p-4 flex flex-col justify-center items-center animate-in fade-in zoom-in duration-200 cursor-default"
        >
          <p className="text-sm font-bold text-slate-700 mb-3">Snooze for how many days?</p>
          <div className="flex items-center gap-6 mb-4">
            <button 
              onClick={() => setSnoozeDays(Math.max(1, snoozeDays - 1))}
              className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-slate-50"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-2xl font-bold text-green-600">{snoozeDays}</span>
            <button 
              onClick={() => setSnoozeDays(snoozeDays + 1)}
              className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 w-full px-4">
            <button 
              onClick={() => setShowSnoozePopup(false)}
              className="flex-1 py-2 text-slate-500 font-semibold"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleAction('SNOOZE', { snoozeExtraDays: snoozeDays })}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Water popup, shown when the user clicks the water button. */}
      {showWaterPopup && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-white/95 z-20 rounded-xl p-4 flex flex-col justify-center items-center animate-in fade-in zoom-in duration-200 cursor-default"
        >
          <p className="text-sm font-bold text-slate-700 mb-4 text-center">How was the soil before watering?</p>
          <div className="flex flex-col gap-3 w-full px-6">
            <button 
              onClick={() => handleAction('WATER', { soilCondition: 'NORMAL' })}
              className="w-full py-3 bg-green-50 text-green-700 rounded-xl font-bold border border-green-200 flex items-center justify-center gap-2"
            >
              <Droplets className="w-4 h-4" /> Normal
            </button>
            <button 
              onClick={() => handleAction('WATER', { soilCondition: 'DRY' })}
              className="w-full py-3 bg-orange-50 text-orange-700 rounded-xl font-bold border border-orange-200 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> Too Dry (-20% time)
            </button>
            <button
              onClick={() => handleAction('WATER', { isAnomaly: true })}
              className="w-full py-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold border border-yellow-200 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> Forgot to log
            </button>
            <p className="text-xs text-slate-500 text-center -mt-2">Use this if you missed a log. The schedule won't be updated.</p>
            <button 
              onClick={() => setShowWaterPopup(false)}
              className="w-full py-2 text-slate-400 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main content of the plant card. */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden border-2",
            !plant.imageUrl && (isOverdue ? "bg-red-500 border-red-500" : isCurrentlyToday ? "bg-green-500 border-green-500" : "bg-slate-300 border-slate-300"),
            plant.imageUrl && (isOverdue ? "border-red-500" : isCurrentlyToday ? "border-green-500" : "border-slate-200")
          )}>
            {plant.imageUrl ? (
              <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold">{plant.name[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{plant.name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {/* Display whether the plant is overdue or when the next check is due. */}
              {isOverdue ? 'Overdue' : 'Due'} {nextDate && !isNaN(nextDate) ? formatDistanceToNow(nextDate, { addSuffix: true }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action buttons for snoozing and watering. */}
        <div className="flex gap-2">
          <button 
            disabled={isHandling}
            onClick={(e) => { e.stopPropagation(); setShowSnoozePopup(true); }}
            className={cn(
              "p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors",
              isHandling && "opacity-20 cursor-not-allowed"
            )}
            title="Snooze"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button 
            disabled={isHandling}
            onClick={(e) => { e.stopPropagation(); setShowWaterPopup(true); }}
            className={cn(
              "p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors",
              isHandling && "opacity-20 cursor-not-allowed"
            )}
            title="Water"
          >
            <Droplets className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer section with last watered date and watering schedule. */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
        <div className="text-center border-r">
          <p className="text-[10px] uppercase font-bold text-slate-400">Last Watered</p>
          <p className="text-xs font-semibold text-slate-700">{lastWateredStr}</p>
        </div>
        <div className="text-center border-r">
          <p className="text-[10px] uppercase font-bold text-slate-400">Schedule</p>
          <p className="text-xs font-semibold text-slate-700">Every {Math.round(plant.currentEma)} days</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Water Amount</p>
          <p className="text-xs font-semibold text-slate-700">{plant.waterAmount ? `${plant.waterAmount}L` : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default PlantCard;
