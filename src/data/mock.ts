import { NovelDetails, Chapter } from '@/types';

export const novels: NovelDetails[] = [
  {
    id: 1,
    title: "The Legend of the Sword",
    cover: "/api/placeholder/200/300",
    author: "Jane Doe",
    rating: 4.5,
    tags: ["Fantasy", "Action"],
    status: "Ongoing",
    description: `In a world where swords contain the spirits of ancient heroes, young Kira discovers she has the rare ability to communicate with these legendary weapons. As the last remaining swordsmith with this gift, she must forge new blades and restore old ones to protect her kingdom from rising darkness.

But with each sword she reawakens, she uncovers more of a conspiracy that has been centuries in the making. The spirits speak of betrayal, of heroes turned villains, and of a catastrophe that only she can prevent.`,
    chapters: [
      { 
        id: 1, 
        title: "The Beginning", 
        dateAdded: "2024-02-12", 
        locked: false,
        content: `The forge was silent in the early morning hours, save for the gentle crackling of embers in the hearth. Kira stood before her grandmother's workbench, running her fingers along the worn wooden surface. Every scratch and burn mark told a story, a legacy of legendary blades crafted by skilled hands.

Her heart raced with anticipation as she prepared for what was to come. Today would be different from all her previous attempts. She could feel it in her bones, in the way the morning light streamed through the dusty windows, casting long shadows across the workshop floor.

The ancient grimoire lay open before her, its pages yellowed with age but the writing still clear and precise. Her grandmother's neat handwriting filled the margins with notes and observations, secrets passed down through generations of master smiths.

"Remember," she whispered to herself, reciting her grandmother's favorite saying, "the metal remembers. Every strike, every fold, every whispered prayer - it all becomes part of the blade's story."`
      },
      { 
        id: 2, 
        title: "First Steps", 
        dateAdded: "2024-02-12", 
        locked: false,
        content: `She picked up her grandmother's old hammer, its weight familiar and comforting in her grip. The first rays of dawn filtered through the high windows, catching on the dust motes that danced in the air. Today would be different. Today, she would attempt what no apprentice had done in generations.

The metal sang to her as she worked it, each strike of the hammer drawing out a note that only she could hear. It was as her grandmother had described in her journals - the steel had a voice, a spirit waiting to be awakened.

Hours passed like minutes as she worked, the rhythm of hammer and anvil becoming a meditation. When she finally looked up, the sun was high in the sky, and there on the bench before her lay something extraordinary: a blade that seemed to shimmer with an inner light.

"Well," came a voice from the doorway, making her jump. Master Chen, her grandmother's old friend and fellow smith, stood watching with an unreadable expression. "It seems the old stories were true after all."`
      },
      { 
        id: 3, 
        title: "The Ancient Spirit", 
        dateAdded: "2024-02-12", 
        locked: false,
        content: `The blade pulsed with a soft blue light, casting strange shadows on the workshop walls. Master Chen approached slowly, his eyes never leaving the sword on the bench. Kira held her breath, waiting for his verdict.

"Your grandmother spoke of this possibility," he said quietly, running a weathered hand along the flat of the blade. "That one day, one of her line would reawaken the old magic. But I never thought..."

His voice trailed off as the sword's glow intensified at his touch. Kira could hear it now, clearer than ever - a whispered voice, ancient and powerful, speaking words in a language she didn't understand but somehow knew in her heart.

"It's trying to tell us something," she breathed, reaching out to touch the blade. The moment her fingers made contact, the world around her exploded into light and sound.`
      },
      { 
        id: 4, 
        title: "Trials of Fire", 
        dateAdded: "2024-02-12", 
        locked: true,
        content: "This chapter is locked. Please unlock to continue reading."
      },
    ],
  },
  // Add more novels here as needed
];

export function getNovel(id: number): NovelDetails | undefined {
  return novels.find(novel => novel.id === id);
}

export function getChapter(novelId: number, chapterId: number): Chapter | undefined {
  const novel = getNovel(novelId);
  return novel?.chapters.find(chapter => chapter.id === chapterId);
}

export function getAdjacentChapters(novelId: number, chapterId: number) {
  const novel = getNovel(novelId);
  if (!novel) return { prev: undefined, next: undefined };

  const currentIndex = novel.chapters.findIndex(ch => ch.id === chapterId);
  if (currentIndex === -1) return { prev: undefined, next: undefined };

  return {
    prev: currentIndex > 0 ? novel.chapters[currentIndex - 1] : undefined,
    next: currentIndex < novel.chapters.length - 1 ? novel.chapters[currentIndex + 1] : undefined,
  };
}