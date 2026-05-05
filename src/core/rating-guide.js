export const RATING_GUIDE_COPY = {
  en: {
    7: {
      summary: 'For very young players. The game should feel gentle, predictable, and low-risk, with no content that points children toward violence, fear, substances, gambling, sexuality, or open chat.',
      sections: [
        { label: 'Player fit', text: 'Best for first-time and family-supervised play where reading skill, reflex pressure, and emotional intensity stay low.' },
        { label: 'Content profile', text: 'No violence, blood, horror, gambling, nudity, pornography, adult humor, strong language, tobacco, alcohol, or drug references.' },
        { label: 'Online safety', text: 'No open conversation features, because unrestricted chat can expose young players to user-generated risk.' }
      ],
      watchFor: ['Open chat', 'Scary scenes', 'Blood or violence', 'Gambling loops', 'Harsh language', 'Substance references', 'Sexualized content']
    },
    4: {
      summary: 'For children who can handle a little more complexity, but still need content that avoids threatening, adult, or social-risk material.',
      sections: [
        { label: 'Player fit', text: 'Good for early-school-age players who can understand rules and mild challenge without mature themes.' },
        { label: 'Content profile', text: 'Still avoids substances, violence, mutilation, cannibalism, adult humor, nudity, pornography, gambling, horror, and harsh language.' },
        { label: 'Visual intensity', text: 'Blood-like elements should not look realistic, and conflict should not become frightening or graphic.' }
      ],
      watchFor: ['Realistic blood', 'Horror tone', 'Harsh language', 'Unfiltered chat', 'Human violence', 'Gambling mechanics', 'Substance references']
    },
    5: {
      summary: 'For teens. The game may carry stronger action or online features, but it should keep violence stylized and avoid explicit adult, gambling, or substance content.',
      sections: [
        { label: 'Player fit', text: 'Suitable when players can process competitive play, fantasy conflict, and moderate themes with guidance as needed.' },
        { label: 'Allowed intensity', text: 'May include limited non-hateful animated violence, blood elements, and filtered online conversations.' },
        { label: 'Content limits', text: 'No tobacco, alcohol, drugs, human mutilation or cannibalism, sexual adult humor, nudity, pornography, gambling, or intense horror.' }
      ],
      watchFor: ['Filtered chat', 'Blood elements', 'Fantasy violence', 'Moderate themes', 'Unrealistic weapons', 'Human harm limits', 'Mature jokes']
    },
    28: {
      summary: 'For older teens. The game can be more intense and socially interactive, but should still avoid explicit sexual material, gambling, substances, and extreme horror.',
      sections: [
        { label: 'Player fit', text: 'Designed for players who can separate fictional conflict from real behavior and handle heavier emotional stakes.' },
        { label: 'Allowed intensity', text: 'May include animated violence without hatred, blood elements, non-sexual adult humor, and filtered online interaction.' },
        { label: 'Content limits', text: 'No tobacco, alcohol, drugs, mutilation, cannibalism, nudity, pornography, gambling, or horror designed to cause extreme fear.' }
      ],
      watchFor: ['Blood elements', 'Online interaction', 'Adult humor', 'Heavier conflict', 'Filtered chat', 'Stronger combat', 'Horror pressure']
    },
    6: {
      summary: 'For adults. The game may include mature themes, stronger violence, horror, gambling-like play without cash-out, and open social interaction, but pornography remains prohibited.',
      sections: [
        { label: 'Player fit', text: 'Intended for players who can evaluate adult themes, risk mechanics, social interaction, and disturbing content independently.' },
        { label: 'Allowed intensity', text: 'May show substance references, animated violence, blood, mutilation, cannibalism, sexual adult humor, horror, and online chat.' },
        { label: 'Content limits', text: 'Pornography is not allowed. Gambling-like activity must not use legal currency, digital assets, exchange value, or cash-out support.' }
      ],
      watchFor: ['Horror', 'Open chat', 'Gambling-like play', 'Graphic violence', 'Substance references', 'Sexual adult humor', 'Mutilation']
    },
    35: {
      summary: 'For refused classification. This marks games that cross prohibited-content boundaries or conflict with Indonesian law, so they should not be treated as normal age-rated releases.',
      sections: [
        { label: 'Classification meaning', text: 'RC is not an age recommendation; it flags content that is prohibited rather than merely unsuitable for younger players.' },
        { label: 'Common triggers', text: 'Pornography, real-money or cash-out gambling, tradeable digital-asset gambling, or content violating Indonesian regulation.' },
        { label: 'Review impact', text: 'Use this as a stop signal for distribution, listing, or recommendation decisions until the underlying issue is resolved.' }
      ],
      watchFor: ['Pornography', 'Cash-out gambling', 'Illegal content', 'Regulatory conflict', 'Real-money betting', 'Tradeable assets', 'Distribution risk']
    }
  },
  id: {
    7: {
      summary: 'Untuk pemain paling muda. Gim sebaiknya terasa ramah, mudah diprediksi, dan rendah risiko, tanpa konten yang mengarah ke kekerasan, takut, zat adiktif, judi, seksualitas, atau chat terbuka.',
      sections: [
        { label: 'Cocok untuk', text: 'Permainan awal dengan pendampingan keluarga, tekanan refleks rendah, dan intensitas emosi yang ringan.' },
        { label: 'Profil konten', text: 'Tidak ada kekerasan, darah, horor, judi, ketelanjangan, pornografi, humor dewasa, bahasa kasar, rokok, alkohol, atau narkotika.' },
        { label: 'Keamanan online', text: 'Tidak ada fitur percakapan terbuka karena chat bebas dapat membawa risiko dari pengguna lain.' }
      ],
      watchFor: ['Chat terbuka', 'Adegan menakutkan', 'Darah atau kekerasan', 'Loop judi', 'Bahasa kasar', 'Referensi zat adiktif', 'Konten seksual']
    },
    4: {
      summary: 'Untuk anak yang sudah siap dengan aturan dan tantangan lebih kompleks, tetapi masih membutuhkan konten yang jauh dari materi dewasa, mengancam, atau berisiko sosial.',
      sections: [
        { label: 'Cocok untuk', text: 'Pemain usia sekolah awal yang dapat memahami aturan dan tantangan ringan tanpa tema dewasa.' },
        { label: 'Profil konten', text: 'Tetap menghindari zat adiktif, kekerasan, mutilasi, kanibalisme, humor dewasa, ketelanjangan, pornografi, judi, horor, dan bahasa kasar.' },
        { label: 'Intensitas visual', text: 'Unsur darah tidak boleh menyerupai darah asli, dan konflik tidak boleh terasa grafis atau menakutkan.' }
      ],
      watchFor: ['Darah realistis', 'Nuansa horor', 'Bahasa kasar', 'Chat tanpa filter', 'Kekerasan manusia', 'Mekanik judi', 'Referensi zat adiktif']
    },
    5: {
      summary: 'Untuk remaja. Gim boleh memuat aksi atau fitur online yang lebih kuat, tetapi kekerasan tetap bergaya animasi dan tidak masuk ke konten eksplisit, judi, atau zat adiktif.',
      sections: [
        { label: 'Cocok untuk', text: 'Pemain yang mulai mampu memahami kompetisi, konflik fantasi, dan tema sedang dengan arahan bila diperlukan.' },
        { label: 'Intensitas boleh', text: 'Dapat memuat kekerasan animasi terbatas tanpa kebencian, unsur darah, dan percakapan online yang difilter.' },
        { label: 'Batas konten', text: 'Tidak ada rokok, alkohol, narkotika, mutilasi atau kanibalisme manusia, humor seksual dewasa, ketelanjangan, pornografi, judi, atau horor intens.' }
      ],
      watchFor: ['Chat difilter', 'Unsur darah', 'Kekerasan fantasi', 'Tema sedang', 'Senjata tidak realistis', 'Batas cedera manusia', 'Lelucon dewasa']
    },
    28: {
      summary: 'Untuk remaja lebih tua. Gim dapat lebih intens dan interaktif secara sosial, tetapi tetap menghindari materi seksual eksplisit, judi, zat adiktif, dan horor ekstrem.',
      sections: [
        { label: 'Cocok untuk', text: 'Pemain yang mampu membedakan konflik fiksi dari perilaku nyata dan menangani taruhan emosional yang lebih berat.' },
        { label: 'Intensitas boleh', text: 'Dapat memuat kekerasan animasi tanpa kebencian, unsur darah, humor dewasa nonseksual, dan interaksi online yang difilter.' },
        { label: 'Batas konten', text: 'Tidak ada rokok, alkohol, narkotika, mutilasi, kanibalisme, ketelanjangan, pornografi, judi, atau horor yang dibuat sangat menakutkan.' }
      ],
      watchFor: ['Unsur darah', 'Interaksi online', 'Humor dewasa', 'Konflik lebih berat', 'Chat difilter', 'Combat lebih kuat', 'Tekanan horor']
    },
    6: {
      summary: 'Untuk dewasa. Gim dapat memuat tema matang, kekerasan lebih kuat, horor, aktivitas mirip judi tanpa cash-out, dan interaksi sosial terbuka, tetapi pornografi tetap dilarang.',
      sections: [
        { label: 'Cocok untuk', text: 'Pemain yang dapat menilai tema dewasa, mekanik risiko, interaksi sosial, dan konten mengganggu secara mandiri.' },
        { label: 'Intensitas boleh', text: 'Dapat menampilkan referensi zat adiktif, kekerasan animasi, darah, mutilasi, kanibalisme, humor seksual dewasa, horor, dan chat online.' },
        { label: 'Batas konten', text: 'Pornografi tidak boleh ada. Aktivitas mirip judi tidak boleh memakai mata uang, aset digital bernilai tukar, atau fitur cash-out.' }
      ],
      watchFor: ['Horor', 'Chat terbuka', 'Aktivitas mirip judi', 'Kekerasan grafis', 'Referensi zat adiktif', 'Humor seksual dewasa', 'Mutilasi']
    },
    35: {
      summary: 'Untuk klasifikasi yang ditolak. Rating ini menandai gim yang melewati batas konten terlarang atau bertentangan dengan hukum Indonesia, bukan sekadar tidak cocok untuk usia tertentu.',
      sections: [
        { label: 'Makna klasifikasi', text: 'RC bukan rekomendasi usia; ini adalah penanda konten terlarang yang perlu dihentikan dari distribusi atau rekomendasi biasa.' },
        { label: 'Pemicu umum', text: 'Pornografi, judi uang nyata atau cash-out, judi aset digital bernilai tukar, atau konten yang melanggar regulasi Indonesia.' },
        { label: 'Dampak review', text: 'Gunakan sebagai sinyal berhenti untuk listing, distribusi, atau rekomendasi sampai masalah dasarnya diperbaiki.' }
      ],
      watchFor: ['Pornografi', 'Judi cash-out', 'Konten ilegal', 'Konflik regulasi', 'Taruhan uang nyata', 'Aset dapat ditukar', 'Risiko distribusi']
    }
  }
};

export function getRatingGuideCopy(id, lang = 'en') {
  const localized = RATING_GUIDE_COPY[lang]?.[id] || RATING_GUIDE_COPY.en[id];
  if (!localized) return { summary: '', sections: [], watchFor: [] };
  return localized;
}
