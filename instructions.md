# 🌿 PlantWise User Guide

Welcome to PlantWise! This guide will help you get the most out of the app and keep your plants happy and healthy.

## TL;DR: The 30-Second Guide

1.  **Add a plant** using the `+` button. Choose a name, photo, and plant type.
2.  The app lists plants needing a soil check at the top.
3.  **Check the soil** of the top plant.
4.  **Soil is WET?** 💧➡️ Tap the **Snooze** button (🕒). The plant moves down the list.
5.  **Soil is DRY?** 🌵➡️ **Water the plant!** Then, tap the **Water** button (💧) and tell the app if the soil was `Normal` or `Too Dry`.
6.  The app learns and adjusts the next reminder. That's it!

---

## 🏛️ The Philosophy: Check, Don't Just Water

The goal of PlantWise isn't to tell you *when to water*, but rather *when to check if your plant needs water*. Every plant and environment is unique. By checking the soil, you give the plant what it needs, exactly when it needs it. The app's smart scheduling learns *your* plant's specific rhythm.

### Recommended Tool: Moisture Meter
For best results, we recommend a soil moisture meter. They are affordable and take the guesswork out of checking your plants. Sticking your finger 2-3cm into the soil also works well.

[A good option on Amazon](https://www.amazon.co.uk/XLUX-Soil-Moisture-Sensor-Meter/dp/B014MJ8J2U/)

---

## 🌱 Getting Started: Adding Your Plants

1.  **Click the large `+` button** on the main screen.
2.  **Fill out the details** in the "Add New Plant" modal:
    *   **Add Photo**: Upload a picture of your plant or paste an image URL. This helps you quickly identify it!
    *   **Plant Name**: Give your plant a personal name (e.g., "Ferdinand the Fiddle Leaf").
    *   **Plant Type**: This is crucial! Select a type from the list. This sets the initial watering schedule before the app starts learning.

| Plant Type | Default Schedule | Best For... |
| :--- | :--- | :--- |
| 🌵 **Cactus** | 30 days | Cacti and other desert plants. |
| 🌱 **Succulent** | 21 days | Succulents and fleshy-leaved plants. |
| 🌴 **Tropical** | 10 days | Plants that like consistently moist (but not wet) soil. |
| 🌿 **Aroid** | 7 days | Monsteras, Philodendrons, Pothos, etc. |
|  fern **Fern** | 5 days | Ferns and other plants that prefer to stay damp. |

    *   **Water Amount (Liters)**: It's helpful to track how much water you give your plant each time for consistency. You can select an amount in Liters.
    *   **Room**: Assign your plant to a room to keep your collection organized. You can even create new rooms from this menu.
3.  **Click "Add Plant"** and you're ready to go!

---

## 💧 The Core Workflow: Snooze or Water

The main dashboard lists your plants, sorted by which ones need checking most urgently.

### When a Plant is Due for a Check...

Your plant will be at the top of the list. It's time to check its soil.

#### Scenario 1: The Soil is Still Wet
The plant doesn't need water yet. Great! This is valuable information for the app.

*   **Action**: Click the **Snooze** button (🕒).
*   A popup will appear suggesting a snooze period (usually ~20% of the plant's typical watering cycle, with a 2-day minimum). You can adjust this up or down based on how wet the soil felt.
*   **Result**: The plant moves down the list, and you'll be reminded again after the snooze period.

#### Scenario 2: The Soil is Dry and Ready for Water
The plant is thirsty. Time to water it.

*   **Action**: **Water your plant first!** Then, click the **Water** button (💧).
*   A popup will ask: "How was the soil before watering?". You have three choices:

    1.  **Normal**: This is the ideal state. The soil was mostly dry, perfect for this plant type.
        *   **Effect**: The app records the time since the last watering. This observation is used to fine-tune the plant's predicted schedule (`currentEma`). For example, if the schedule was 10 days but you watered after 12, the app will adjust its estimate towards the new, longer interval.

    2.  **Too Dry**: The soil was bone-dry, or the plant was showing signs of thirst (wilting, drooping). This often happens in warmer months.
        *   **Effect**: The app logs the watering and adjusts the schedule like a `Normal` watering, but it also **shortens the next watering interval by 20%** to prevent this from happening again.

    3.  **Logged Late**: You forgot to log the watering when you did it, or you were on vacation and watered much later than usual. This is an anomaly.
        *   **Effect**: The app logs the watering event so you have a record, but **it does not update the schedule**. This prevents one-off events from messing up the finely-tuned learning algorithm.

---

## 🛠️ Managing Your Plants & Settings

### Editing a Plant
Click on a plant card to open its details page, then find the edit button. Here you can:
*   Change the name, photo, room, etc.
*   Update the **Water Amount**.

### Repotting or Moving a Plant
Big changes can disrupt a plant's watering schedule (e.g., moving it to a sunnier spot, or giving it a bigger pot).

*   **Action**: In the "Edit Plant" menu, click the **Repotted** button (🔄).
*   **Effect**: This will **reset the plant's learned schedule** back to the conservative default for its plant type. The app will then begin learning the new schedule from scratch.

### Customizing the Algorithm
In the **Settings** menu (⚙️), you can fine-tune the learning algorithm:

*   **Adaptability (Alpha)**: This controls how quickly the app reacts to new watering intervals.
    *   **Lower (Stable)**: The schedule is more stable and changes slowly. Good for consistent environments.
    *   **Higher (Reactive)**: The schedule adapts very quickly to the most recent watering time. Good if your plant's needs change often (e.g., with seasons).
    *   *Default: 0.35*

*   **Snooze Length**: This controls the default snooze suggestion.
    *   **Lower (Short)**: Suggests shorter snooze periods.
    *   **Higher (Long)**: Suggests longer snooze periods.
    *   *Default: 20% of the estimated schedule.*

### 📈 Stats & History
Click on any plant to see its details, including a chart of its watering history over time. This helps you visualize its watering rhythm and see how the schedule estimate evolves.

### 🪦 The Graveyard
Accidentally deleted a plant? No worries. In **Settings**, you can access the **Plant Graveyard**. From there, you can view and restore any plants you've previously deleted.
