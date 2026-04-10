import PocketBase from 'pocketbase';

const pb = new PocketBase('https://coffee-pos.pockethost.io');

async function seed() {
  try {
    console.log('Starting seed process...');

    // 1. Create Categories
    const drinkCat = await pb.collection('categories').create({ name: 'Đồ uống', icon: 'coffee' });
    const snackCat = await pb.collection('categories').create({ name: 'Đồ ăn vặt', icon: 'cookie' });

    console.log('Categories created.');

    // 2. Create Users (10 users, one is SA, all passwords "1")
    const roles = ['admin', 'staff', 'barista'];
    for (let i = 1; i <= 10; i++) {
      const username = i === 1 ? 'SA' : `user${i}`;
      const role = i === 1 ? 'admin' : roles[i % roles.length];
      try {
        await pb.collection('users').create({
          username: username,
          email: `${username.toLowerCase()}@example.com`,
          password: '1',
          passwordConfirm: '1',
          role: role,
        });
        console.log(`User ${username} created with role ${role}`);
      } catch (e) {
        console.log(`User ${username} might already exist.`);
      }
    }

    // 3. Create 50 Drinks (15k - 50k)
    const drinkNames = [
      'Cà phê đen', 'Cà phê sữa', 'Bạc xỉu', 'Cà phê muối', 'Cà phê trứng',
      'Trà đào cam sả', 'Trà vải', 'Trà dâu', 'Trà xanh nhài', 'Trà đen',
      'Sữa chua trân châu', 'Sữa chua dẻo', 'Sữa chua mít', 'Sữa chua nếp cẩm',
      'Sinh tố bơ', 'Sinh tố xoài', 'Sinh tố dâu', 'Sinh tố sapoche',
      'Nước ép cam', 'Nước ép dưa hấu', 'Nước ép táo', 'Nước ép thơm',
      'Trà sữa truyền thống', 'Trà sữa thái xanh', 'Trà sữa thái đỏ', 'Trà sữa matcha',
      'Cacao nóng', 'Cacao đá', 'Matcha latte', 'Socola đá xay',
      'Chanh tuyết', 'Tắc xí muội', 'Soda blue ocean', 'Soda dâu',
      'Trà sen vàng', 'Trà thạch đào', 'Trà thạch vải', 'Trà ô long',
      'Cà phê cốt dừa', 'Cà phê khoai môn', 'Trà sữa khoai môn', 'Sữa tươi trân châu đường đen',
      'Nước chanh dây', 'Nước ép cà rốt', 'Nước ép bưởi', 'Trà gừng nóng',
      'Trà hoa cúc', 'Trà mật anh đào', 'Trà atiso', 'Nước suối'
    ];

    for (let i = 0; i < 50; i++) {
      const name = drinkNames[i] || `Đồ uống ${i + 1}`;
      const price = Math.floor(Math.random() * (50 - 15 + 1) + 15) * 1000;
      await pb.collection('menu_items').create({
        name: name,
        description: `Mô tả cho ${name}`,
        price: price,
        category: drinkCat.id,
        available: true
      });
    }
    console.log('50 Drinks created.');

    // 4. Create 20 Snacks (15k - 50k)
    const snackNames = [
      'Hướng dương', 'Hạt điều', 'Hạt dẻ', 'Khô gà lá chanh', 'Khô bò',
      'Bánh tráng trộn', 'Bánh tráng cuốn', 'Cá viên chiên', 'Bò viên chiên', 'Xúc xích đức',
      'Khoai tây chiên', 'Khoai lang kén', 'Phô mai que', 'Nem chua rán',
      'Bánh mì que', 'Bánh sừng bò', 'Bánh quy bơ', 'Hướng dương vị dừa',
      'Đậu phộng tỏi ớt', 'Bắp rang bơ'
    ];

    for (let i = 0; i < 20; i++) {
      const name = snackNames[i] || `Đồ ăn vặt ${i + 1}`;
      const price = Math.floor(Math.random() * (50 - 15 + 1) + 15) * 1000;
      await pb.collection('menu_items').create({
        name: name,
        description: `Mô tả cho ${name}`,
        price: price,
        category: snackCat.id,
        available: true
      });
    }
    console.log('20 Snacks created.');

    console.log('Seed process completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  }
}

seed();
