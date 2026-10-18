namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Provider-agnostic prompt text for floor-plan analysis - identical instructions regardless of
/// which vision model is actually answering them. Only the tool/schema *wire format* differs
/// between providers (Gemini's uppercase-typed schema vs. standard JSON Schema for OpenAI-
/// compatible providers like Groq), so that part stays local to each provider's service class.
/// </summary>
internal static class FloorPlanPrompts
{
    public const string RoomsToolName = "report_rooms";
    public const string OpeningsToolName = "report_openings";
    public const string RoomOutlineToolName = "report_room_outline";

    public const string RoomsToolDescription = "Report every room visible in the floor plan image.";
    public const string OpeningsToolDescription = "Report every door and window symbol found in this cropped image.";
    public const string RoomOutlineToolDescription = "Report the precise outline of the one room shown in this cropped image.";

    public const string RoomsSystemPrompt =
        "You are analyzing an architectural floor plan image for a real-estate app. Trace the outline of every distinct " +
        "room/space you can see, as closely as your vision allows - including small ones like closets, utility rooms, and " +
        "walk-in wardrobes; treat each as its own room. Scan the ENTIRE image edge to edge, including any secondary " +
        "unit, annex, or extra section that is visually separated from the main space by its own walls (often drawn " +
        "smaller, off to one side, or below the main layout) - do not stop once you've covered what looks like the " +
        "main unit.\n\n" +
        "Report each room's outline as a polygon of [xFraction, yFraction] points - fractions of the image's width/height " +
        "(0.0 to 1.0), not pixel coordinates. CRITICAL: walk the room's wall corners in a single consistent direction " +
        "around its perimeter (clockwise or counter-clockwise, pick one and stay consistent) - like tracing the wall " +
        "with a finger without ever jumping across to a non-adjacent corner. Never list points in a scrambled or " +
        "jumbled order (e.g. two opposite corners then the other two) - that produces a self-crossing \"bowtie\" shape " +
        "instead of the room's actual outline, even though the corners themselves are correct. Approximate is fine; a " +
        "human will review and correct your output afterward, so prioritize getting the room count, correct point " +
        "ORDER, and labels right over pixel precision.\n\n" +
        "Transcribe any printed dimension text you can read for a room, and the overall stated size/title if printed on " +
        "the plan. Only report rooms you can actually see outlined on the plan - do not invent rooms.\n\n" +
        "There is no manual scale calibration step - you must ALWAYS also estimate the real-world scale yourself, in " +
        "estimatedTotalWidthMeters, using standard market/architectural reference sizes (typical door/window/bed/hallway " +
        "dimensions) as a ruler against the drawing. Provide your best numeric estimate even when no dimension text is printed.";

    public const string OpeningsSystemPrompt =
        "You are a meticulous architectural draftsperson reviewing a floor plan image. Your ONLY job right now is to find " +
        "every door and window drafting symbol drawn on it - do not describe rooms, just openings.\n\n" +
        "Standard symbols to look for, systematically, wall by wall, room by room:\n" +
        "- DOOR (single swing): a gap cut into the wall line, paired with a quarter-circle arc plus a straight radius line " +
        "showing the swing path. The arc may open into either room on either side of the wall, and may be drawn faintly " +
        "or thin - look closely along every wall, not just at a glance.\n" +
        "- DOOR (double/French): a gap with TWO quarter-circle arcs meeting in the middle.\n" +
        "- CLOSET / WARDROBE / UTILITY door: very often drawn WITHOUT any swing arc at all - instead as one or two short " +
        "angled \"v\" / chevron lines (bi-fold or sliding doors) spanning the entrance gap. These are easy to miss because " +
        "there's no arc; still report every one you find as type \"door\".\n" +
        "- WINDOW: a break in an exterior wall filled with one or more thin parallel lines running across the wall's " +
        "thickness (perpendicular to the wall direction), with no swing arc.\n\n" +
        "Ground rules:\n" +
        "- Go through the image systematically, one room at a time, and check every one of its walls for a symbol before " +
        "moving to the next room. Nearly every enclosed space (bedrooms, bathrooms, closets, utility rooms, the main " +
        "entry) has at least one door - if a room's outline is fully enclosed by walls with no opening you found, look " +
        "again before concluding it has none.\n" +
        "- Exterior walls (the outer boundary of the whole unit) typically have one or more windows; check every " +
        "exterior wall segment.\n" +
        "- Report each opening as a single [xFraction, yFraction] point centered on the gap/symbol, its type, and the " +
        "room it leads into if you can tell.\n" +
        "- Precision doesn't need to be pixel-perfect - a human reviews and can delete false positives - so when " +
        "genuinely unsure whether a faint mark is a door symbol vs. just a room label or furniture icon, err on the side " +
        "of reporting it rather than skipping it.";

    public static string OpeningsUserText(string roomLabel) =>
        $"This is a cropped, zoomed-in view of one room (\"{roomLabel}\") from a floor plan, including a bit of its " +
        "surrounding walls and neighboring space. Find this room's door — there is almost always exactly one, though a " +
        "closet may share its opening with the room it's inside — and any windows on its walls. Report coordinates " +
        "relative to THIS cropped image only.";

    /// <summary>
    /// Same symbol-identification guidance as <see cref="OpeningsSystemPrompt"/>, but for a BATCH of
    /// several rooms' crops sent in one request (used by providers whose API/rate-limit headroom
    /// makes one combined call cheaper than one call per room, e.g. Claude) - every image must be
    /// kept independent of the others, and every image must get its own reported group even when it
    /// has zero openings, so the caller can map each group back to the room it came from by position.
    /// </summary>
    public const string OpeningsBatchSystemPrompt =
        "You are a meticulous architectural draftsperson reviewing several cropped room images from the SAME floor " +
        "plan, sent together in one batch for efficiency. Each image is preceded by a short text label \"Image N: " +
        "<room label>\" - treat every image as completely independent of the others; an opening you find in one " +
        "room's crop must never be attributed to a different room. Your ONLY job right now is to find every door " +
        "and window drafting symbol drawn in EACH image - do not describe rooms, just openings.\n\n" +
        "Standard symbols to look for, systematically, wall by wall, in every image:\n" +
        "- DOOR (single swing): a gap cut into the wall line, paired with a quarter-circle arc plus a straight radius " +
        "line showing the swing path. The arc may open into either room on either side of the wall, and may be drawn " +
        "faintly or thin - look closely along every wall, not just at a glance.\n" +
        "- DOOR (double/French): a gap with TWO quarter-circle arcs meeting in the middle.\n" +
        "- CLOSET / WARDROBE / UTILITY door: very often drawn WITHOUT any swing arc at all - instead as one or two " +
        "short angled \"v\" / chevron lines (bi-fold or sliding doors) spanning the entrance gap. These are easy to " +
        "miss because there's no arc; still report every one you find as type \"door\".\n" +
        "- WINDOW: a break in an exterior wall filled with one or more thin parallel lines running across the wall's " +
        "thickness (perpendicular to the wall direction), with no swing arc.\n\n" +
        "Ground rules:\n" +
        "- Nearly every enclosed space (bedrooms, bathrooms, closets, utility rooms, the main entry) has at least " +
        "one door - if an image's room looks fully enclosed with no opening found yet, look again before concluding " +
        "it has none.\n" +
        "- Exterior walls typically have one or more windows; check every exterior wall segment visible in the crop.\n" +
        "- Report each opening as a single [xFraction, yFraction] point centered on the gap/symbol, as a fraction of " +
        "THAT image's own width/height (0.0 to 1.0) - never coordinates relative to any other image or the original " +
        "full floor plan.\n" +
        "- Precision doesn't need to be pixel-perfect - a human reviews and can delete false positives - so when " +
        "genuinely unsure whether a faint mark is a door symbol vs. just a room label or furniture icon, err on the " +
        "side of reporting it rather than skipping it.\n" +
        "- CRITICAL: report one group per image, using that image's number as imageNumber (1-based, matching its " +
        "\"Image N\" label exactly) - include EVERY image's group even when you find zero openings in it (report an " +
        "empty openings list rather than omitting the group), so results can be matched back to the right room.";

    public static string OpeningsBatchUserText(int roomCount) =>
        $"Above are {roomCount} cropped room images from one floor plan, each a zoomed-in view of a single room " +
        "including a bit of its surrounding walls. For each image, find that room's door - there is almost always " +
        "exactly one, though a closet may share its opening with the room it's inside - and any windows on its " +
        "walls. Report coordinates relative to EACH image's own cropped frame, never another image's.";

    public const string RoomOutlineSystemPrompt =
        "You are a meticulous architectural draftsperson. You are shown a cropped, zoomed-in view centered on ONE " +
        "specific room from a larger floor plan. Trace ONLY that one room's outline as precisely as you can, " +
        "ignoring any other rooms, hallways, or walls only partially visible at the edges of this crop.\n\n" +
        "Report the outline as a polygon of [xFraction, yFraction] points, as fractions of THIS CROPPED image's " +
        "width/height (0.0 to 1.0) - not the original full floor plan. CRITICAL: walk the room's wall corners in a " +
        "single consistent direction around its perimeter (clockwise or counter-clockwise, pick one and stay " +
        "consistent) - like tracing the wall with a finger without ever jumping across to a non-adjacent corner. A " +
        "scrambled point order produces a self-crossing \"bowtie\" shape instead of the room's actual outline, even " +
        "if the corners themselves are right. At least 3 points, following the room's true shape (it may be " +
        "L-shaped or otherwise irregular - do not simplify it into a rectangle).";

    public static string RoomOutlineUserText(string roomLabel) =>
        $"This is a cropped, zoomed-in view centered on one room (\"{roomLabel}\") from a floor plan, including a " +
        "bit of its surrounding walls and neighboring space for context. Trace THIS room's precise outline only, " +
        "ignoring neighboring rooms/hallways visible at the crop's edges. Report coordinates relative to THIS " +
        "cropped image only.";
}
