import type { Language } from '@/shared/types';

export interface DescriptorGuideCopy {
  summary: string;
  sections: Array<{ label: string; text: string }>;
  watchFor: string[];
}

export const DESCRIPTOR_GUIDE_COPY: Record<Language, Record<number, DescriptorGuideCopy>> = {
  en: {
    2: {
      summary: 'Flags coarse, insulting, or aggressive language. The concern is not only individual words, but also whether dialogue normalizes hostility or adult tone.',
      sections: [
        { label: 'What it covers', text: 'Swearing, slurs, aggressive insults, crude jokes, threats, or repeated hostile dialogue from characters or players.' },
        { label: 'Review focus', text: 'Check frequency, context, translation, voice lines, subtitles, and whether users can create or send similar language.' },
        { label: 'Player impact', text: 'Language can raise the age fit even when the visual content is mild, especially if it is repeated or targeted.' }
      ],
      watchFor: ['Swearing', 'Insults', 'Threats', 'User chat']
    },
    3: {
      summary: 'Flags blood, mutilation, or cannibalism. This descriptor usually depends on how realistic, frequent, and central the body harm is.',
      sections: [
        { label: 'What it covers', text: 'Blood effects, wounds, dismemberment, body damage, corpses, cannibalism, or scenes focused on injury detail.' },
        { label: 'Review focus', text: 'Look at color realism, camera focus, sound, repetition, human-like targets, and whether harm is rewarded.' },
        { label: 'Player impact', text: 'Stylized effects may be less intense, while realistic blood or mutilation can quickly push content into older ratings.' }
      ],
      watchFor: ['Blood color', 'Dismemberment', 'Corpses', 'Injury detail']
    },
    5: {
      summary: 'Flags horror content designed to create fear, dread, shock, or sustained tension. Tone and presentation matter as much as the creature or setting.',
      sections: [
        { label: 'What it covers', text: 'Jump scares, disturbing imagery, pursuit sequences, dread-heavy sound design, supernatural fear, or panic-driven play.' },
        { label: 'Review focus', text: 'Check intensity, duration, player helplessness, visual grotesqueness, audio pressure, and recovery time after scares.' },
        { label: 'Player impact', text: 'Mild spooky themes differ from fear-driven design; sustained terror usually requires an older age fit.' }
      ],
      watchFor: ['Jump scares', 'Chase scenes', 'Disturbing images', 'Fear audio']
    },
    10: {
      summary: 'Flags online interaction where players may communicate, exchange content, or affect each other. The main concern is exposure to user-generated behavior.',
      sections: [
        { label: 'What it covers', text: 'Text chat, voice chat, friend systems, user names, user-generated content, trading, teams, clans, or multiplayer contact.' },
        { label: 'Review focus', text: 'Check moderation, filters, reporting, blocking, parental controls, private messaging, and whether chat is required to progress.' },
        { label: 'Player impact', text: 'Online features can raise risk even if the game content itself is mild, because other users are outside the developer script.' }
      ],
      watchFor: ['Voice chat', 'Private messages', 'UGC', 'Moderation tools']
    },
    11: {
      summary: 'Flags human-like character appearance that may involve revealing body presentation. Context, camera focus, and sexual framing determine severity.',
      sections: [
        { label: 'What it covers', text: 'Revealing outfits, emphasized body parts, suggestive poses, partial nudity, or presentation centered on sexualized appearance.' },
        { label: 'Review focus', text: 'Look at age portrayal, camera framing, animation, unlockable costumes, marketing images, and whether the view is optional.' },
        { label: 'Player impact', text: 'Nonsexual stylization is different from sexual framing; repeated focus or reward-driven viewing increases concern.' }
      ],
      watchFor: ['Suggestive poses', 'Revealing outfits', 'Camera focus', 'Costumes']
    },
    12: {
      summary: 'Flags tobacco, alcohol, narcotics, psychotropics, or other addictive substances. Both direct use and promotional framing matter.',
      sections: [
        { label: 'What it covers', text: 'Smoking, drinking, drug use, substance icons, shops, quests, item buffs, jokes, dialogue, or references to addictive products.' },
        { label: 'Review focus', text: 'Check whether substances are shown as rewards, power-ups, lifestyle markers, background detail, or harmful consequences.' },
        { label: 'Player impact', text: 'A brief negative reference is different from glamorized or interactive use, especially when mechanics reward consumption.' }
      ],
      watchFor: ['Smoking', 'Alcohol', 'Drug items', 'Buff effects']
    },
    15: {
      summary: 'Flags gambling simulation or chance-based betting loops. Review the mechanic, reward value, cash-out possibility, and resemblance to regulated gambling.',
      sections: [
        { label: 'What it covers', text: 'Casino games, betting, loot-style chance loops, roulette, card wagering, slot-like presentation, or prize systems based on luck.' },
        { label: 'Review focus', text: 'Check real-money use, digital assets, exchange value, cash-out support, odds disclosure, repeat spend pressure, and age gates.' },
        { label: 'Player impact', text: 'Pure fiction may be lower risk, but currency value, tradeability, and cash-out features can move content toward prohibited territory.' }
      ],
      watchFor: ['Betting', 'Loot chance', 'Cash-out', 'Tradable assets']
    },
    26: {
      summary: 'Flags violent action or conflict. The rating impact depends on realism, target type, player agency, repetition, and whether violence is framed as hateful.',
      sections: [
        { label: 'What it covers', text: 'Combat, attacks, weapon use, fighting, killing, explosions, enemy takedowns, or mechanics built around harming characters.' },
        { label: 'Review focus', text: 'Check target realism, weapon realism, blood pairing, camera distance, reward systems, and whether violence is against human-like figures.' },
        { label: 'Player impact', text: 'Cartoon conflict can be milder, while realistic weapons, human targets, or repeated harm increase age sensitivity.' }
      ],
      watchFor: ['Weapons', 'Human targets', 'Repeated combat', 'Rewarded harm']
    },
    36: {
      summary: 'Flags sexual content or pornography-related material. This descriptor needs careful review because explicit sexual content can become prohibited.',
      sections: [
        { label: 'What it covers', text: 'Sexual dialogue, erotic imagery, pornography, explicit scenes, nudity with sexual framing, sexual services, or fetishized presentation.' },
        { label: 'Review focus', text: 'Check explicitness, age portrayal, consent framing, interactivity, censorship, unlockables, downloadable content, and store screenshots.' },
        { label: 'Player impact', text: 'Suggestive material may affect age fit; pornography or explicit sexual content can trigger refused classification.' }
      ],
      watchFor: ['Explicit scenes', 'Nudity', 'Sexual dialogue', 'DLC content']
    }
  },
  id: {
    2: {
      summary: 'Menandai bahasa kasar, menghina, atau agresif. Risikonya bukan hanya kata tertentu, tetapi juga apakah dialog menormalisasi permusuhan atau nada dewasa.',
      sections: [
        { label: 'Cakupan', text: 'Umpatan, hinaan, ancaman, lelucon kasar, dialog agresif, atau bahasa serupa dari karakter maupun pemain.' },
        { label: 'Fokus review', text: 'Periksa frekuensi, konteks, terjemahan, voice line, subtitle, dan apakah pengguna dapat membuat bahasa yang sama.' },
        { label: 'Dampak pemain', text: 'Bahasa dapat menaikkan batas usia walau visualnya ringan, terutama bila berulang atau menyerang pihak tertentu.' }
      ],
      watchFor: ['Umpatan', 'Hinaan', 'Ancaman', 'Chat pengguna']
    },
    3: {
      summary: 'Menandai darah, mutilasi, atau kanibalisme. Dampaknya bergantung pada seberapa realistis, sering, dan sentral kerusakan tubuh ditampilkan.',
      sections: [
        { label: 'Cakupan', text: 'Efek darah, luka, potongan tubuh, kerusakan tubuh, mayat, kanibalisme, atau adegan yang menonjolkan detail cedera.' },
        { label: 'Fokus review', text: 'Periksa realisme warna, fokus kamera, suara, pengulangan, target menyerupai manusia, dan apakah cedera diberi hadiah.' },
        { label: 'Dampak pemain', text: 'Efek bergaya kartun bisa lebih ringan, sedangkan darah realistis atau mutilasi cepat mendorong rating lebih dewasa.' }
      ],
      watchFor: ['Warna darah', 'Mutilasi', 'Mayat', 'Detail cedera']
    },
    5: {
      summary: 'Menandai horor yang dirancang untuk membuat takut, tegang, terkejut, atau tertekan. Nada dan penyajian sama pentingnya dengan makhluk atau latarnya.',
      sections: [
        { label: 'Cakupan', text: 'Jump scare, gambar mengganggu, adegan dikejar, desain suara mencekam, ketakutan supernatural, atau permainan berbasis panik.' },
        { label: 'Fokus review', text: 'Periksa intensitas, durasi, rasa tidak berdaya, visual grotesk, tekanan audio, dan jeda pemulihan setelah ketakutan.' },
        { label: 'Dampak pemain', text: 'Tema seram ringan berbeda dari desain yang mengejar rasa takut; teror berkelanjutan biasanya perlu batas usia lebih tinggi.' }
      ],
      watchFor: ['Jump scare', 'Adegan dikejar', 'Gambar mengganggu', 'Audio tegang']
    },
    10: {
      summary: 'Menandai interaksi daring ketika pemain dapat berkomunikasi, bertukar konten, atau memengaruhi pemain lain. Risiko utamanya adalah perilaku buatan pengguna.',
      sections: [
        { label: 'Cakupan', text: 'Chat teks, chat suara, sistem teman, nama pengguna, konten buatan pengguna, trading, tim, klan, atau kontak multiplayer.' },
        { label: 'Fokus review', text: 'Periksa moderasi, filter, pelaporan, blokir, kontrol orang tua, pesan privat, dan apakah chat wajib untuk progres.' },
        { label: 'Dampak pemain', text: 'Fitur online dapat menaikkan risiko walau konten gim ringan, karena pengguna lain berada di luar skrip pengembang.' }
      ],
      watchFor: ['Chat suara', 'Pesan privat', 'UGC', 'Moderasi']
    },
    11: {
      summary: 'Menandai penampilan tokoh menyerupai manusia yang dapat mengarah ke tampilan tubuh terbuka. Konteks, kamera, dan framing seksual menentukan tingkatnya.',
      sections: [
        { label: 'Cakupan', text: 'Pakaian terbuka, bagian tubuh yang ditonjolkan, pose sugestif, ketelanjangan sebagian, atau tampilan yang berpusat pada seksualisasi.' },
        { label: 'Fokus review', text: 'Periksa penggambaran usia, framing kamera, animasi, kostum unlockable, materi promosi, dan apakah tampilan itu opsional.' },
        { label: 'Dampak pemain', text: 'Stilisasi nonseksual berbeda dari framing seksual; fokus berulang atau tampilan berbasis hadiah meningkatkan kekhawatiran.' }
      ],
      watchFor: ['Pose sugestif', 'Pakaian terbuka', 'Fokus kamera', 'Kostum']
    },
    12: {
      summary: 'Menandai rokok, alkohol, narkotika, psikotropika, atau zat adiktif lain. Penggunaan langsung maupun framing promosi sama-sama perlu diperiksa.',
      sections: [
        { label: 'Cakupan', text: 'Merokok, minum alkohol, penggunaan obat, ikon zat, toko, quest, buff item, lelucon, dialog, atau referensi produk adiktif.' },
        { label: 'Fokus review', text: 'Periksa apakah zat ditampilkan sebagai hadiah, power-up, gaya hidup, detail latar, atau konsekuensi buruk.' },
        { label: 'Dampak pemain', text: 'Referensi singkat yang negatif berbeda dari penggunaan yang diglamorisasi atau diberi hadiah mekanik.' }
      ],
      watchFor: ['Rokok', 'Alkohol', 'Item obat', 'Efek buff']
    },
    15: {
      summary: 'Menandai simulasi judi atau loop taruhan berbasis peluang. Tinjau mekanik, nilai hadiah, kemungkinan cash-out, dan kemiripan dengan judi teregulasi.',
      sections: [
        { label: 'Cakupan', text: 'Simulasi judi seperti kasino, taruhan, loop peluang, roulette, kartu bertaruh, tampilan seperti slot, atau hadiah berbasis untung-untungan.' },
        { label: 'Fokus review', text: 'Periksa uang nyata, aset digital, nilai tukar, fitur cash-out, informasi peluang, tekanan belanja berulang, dan batas usia.' },
        { label: 'Dampak pemain', text: 'Fiksi murni bisa lebih rendah risiko, tetapi nilai tukar, tradeability, dan cash-out dapat mengarah ke konten terlarang.' }
      ],
      watchFor: ['Taruhan', 'Loot chance', 'Cash-out', 'Aset tradable']
    },
    26: {
      summary: 'Menandai aksi kekerasan atau konflik. Dampaknya bergantung pada realisme, jenis target, kendali pemain, pengulangan, dan apakah kekerasan bernuansa kebencian.',
      sections: [
        { label: 'Cakupan', text: 'Pertarungan, serangan, senjata, duel, pembunuhan, ledakan, takedown musuh, atau mekanik yang berpusat pada melukai karakter.' },
        { label: 'Fokus review', text: 'Periksa realisme target, realisme senjata, pasangan dengan darah, jarak kamera, hadiah, dan target menyerupai manusia.' },
        { label: 'Dampak pemain', text: 'Konflik kartun bisa lebih ringan, sedangkan senjata realistis, target manusia, atau cedera berulang menaikkan sensitivitas usia.' }
      ],
      watchFor: ['Senjata', 'Target manusia', 'Combat berulang', 'Cedera diberi hadiah']
    },
    36: {
      summary: 'Menandai konten seksual atau materi terkait pornografi. Descriptor ini perlu ditinjau hati-hati karena konten seksual eksplisit dapat menjadi terlarang.',
      sections: [
        { label: 'Cakupan', text: 'Dialog seksual, gambar erotis, pornografi, adegan eksplisit, ketelanjangan dengan framing seksual, jasa seksual, atau tampilan fetish.' },
        { label: 'Fokus review', text: 'Periksa eksplisit tidaknya konten, penggambaran usia, consent, interaktivitas, sensor, unlockable, DLC, dan screenshot toko.' },
        { label: 'Dampak pemain', text: 'Materi sugestif dapat memengaruhi rating usia; pornografi atau konten seksual eksplisit dapat memicu klasifikasi ditolak.' }
      ],
      watchFor: ['Adegan eksplisit', 'Ketelanjangan', 'Dialog seksual', 'Konten DLC']
    }
  }
};

export function getDescriptorGuideCopy(id: number, lang: Language = 'en'): DescriptorGuideCopy {
  const localized = DESCRIPTOR_GUIDE_COPY[lang]?.[id] || DESCRIPTOR_GUIDE_COPY.en[id];
  if (!localized) return { summary: '', sections: [], watchFor: [] };
  return localized;
}
