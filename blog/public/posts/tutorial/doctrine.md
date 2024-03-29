## Обзор Doctrine

Несмотря на то, что Doctrine я использую не первый год, пришлось перечитать документацию, чтобы нигде не наврать. Общим счетом это заняло у меня
X часов.

Доктрина состоит из [набора модулей](https://www.doctrine-project.org/projects.html) с четко разграниченными зонами ответственности.
Наиболее значимые это DBAL (database abstraction layer) и ORM (Object Relational Mapper).

[далее спойлеры]

(выжимка из документации 2.8)
DBAL - это просто надстройка над PDO (PDO в свою очередь - расширение для PHP, позволяющее одинаково взаимодействовать с различными базами данных).
Это выражается следующим соотношением классов:
PDO 			DBAL
PDO 			Doctrine\DBAL\Connection (имплементирует Doctrine\DBAL\Driver\Connection)
PDOStatement    Doctrine\DBAL\Statement  (имплементирует Doctrine\DBAL\Driver\Statement)
Эта обертка опционально добавляет логирование запросов, кэшировние результатов, события и переносимый контроль транзакций.

Типичное использование: из конкретного Driver получаем Connection, через который выполняем любые запросы к базе,
через метод exec или используя Statement (примеры будут дальше). Также Connection предоставляет beginTransaction/commit/rollBack
интерфейс для транзакций и errorCode/errorInfo для получения информации о ошибках из БД.
Помимо этого, для каждого драйвера (или набора разных драйверов к одной базе, как например PDOMysql/Mysqli/ext-mysql)
есть реализация интерфейса Doctrine\DBAL\Platforms, которая инкапсулирует множество специфичных особенностей конкретных баз данных
в едином интерфейсе (мастхэв для изучения синтаксиса и особенностей БД).
По $conn->getDatabasePlatform() можно идентифицировать текущее соединение для специфичных операций. Более того, указав 'platform'
в опциях коннекта можно дать кастомный идентификатор для вызова непереносимого функционала.

Также в DBAL поставляется набор Types, для преобразования типов PHP в типы БД и наоборот, с возможностью расширения.

	# тут можно включить логгер, кэшинг результатов, фильтр схем, отключить автокоммит
	$config = new \Doctrine\DBAL\Configuration();
	$connectionParams = [ типичные папраметры коннекта - логин. пароль. хост и т.д.];
	# получаем wrapped коннект
	# тут 3им параметром МОЖНО передать eventManager, config тоже опциональный
	$conn = \Doctrine\DBAL\DriverManager::getConnection($connectionParams, $config);

	# получение данных (по сути stmt это курсор?)
	# так делать не круто: sql инъекции, кавычки, лишние попытки оптимизации со стороны бд
	$stmt = $conn->query("SELECT * FROM articles");
	while ($row = $stmt->fetch()) {
	    echo $row['headline'];
	}

	# так то лучше! Это обязательно для встроенной защиты от SQL инъекций
	$sql = "SELECT * FROM users WHERE name = :name OR username = :name";
	$stmt = $conn->prepare($sql);
	$stmt->bindValue("name", $name);
	$stmt->execute();

Врочем, есть способ использовать конкатенацию с экранированием (всё что в quote не будет выражением):

	$sql = "SELECT * FROM users WHERE name = " . $connection->quote($_GET['username']);

prepare($sql)                        - просто для переиспользования одного запроса с разными параметрами
executeQuery($sql, $params, $types)  - полезен для SELECT, возвращает данные, подготовленные для итерации
executeUpdate($sql, $params, $types) - возвращает кол-во затронутых строк (UPDATE, DELETE, INSERT)

bindValue($pos, $value, $type)  - привязать значение
bindParam($pos, &$param, $type) - привязать ссылку на значение

// $stmt->execute();

(только на SELECT)
fetch($fetchStyle)      - берёт строку результата
fetchAssoc($fetchStyle) - берёт строку результата ассоциативным массивом
fetchColumn($column)    - берёт колонку из строки результата
fetchAll($fetchStyle)   - берёт все строки

Подробнее про типы:

	$date = new \DateTime("2011-03-05 14:00:21");
	$stmt = $conn->prepare("SELECT * FROM articles WHERE publish_date > ?");
	$stmt->bindValue(1, $date, "datetime"); // доктриновский тип
	$stmt->execute();
Так мы абстрагируем запрос от конкретных функций преобразования типов (для bindParam типы доктрины не сработают).

	$stmt = $conn->executeQuery('SELECT * FROM articles WHERE id IN (?)',
	    [[1, 2, 3, 4, 5, 6]],
	    [\Doctrine\DBAL\Connection::PARAM_INT_ARRAY]
	);
Так мы упрощенным способом биндим массив параметров.

	$conn->delete('user', ['id' => 1]);
	$conn->insert('user', ['username' => 'jwage']);
	$conn->update('user', ['username' => 'jwage'], ['id' => 1]);
Хелперы.

[спойлер - queryBuilder]

	$queryBuilder = $conn->createQueryBuilder();

	$queryBuilder
    ->select('id', 'name')
    ->from('users')
    ->where(
        $queryBuilder->expr()->andX(
            $queryBuilder->expr()->eq('username', '?'),
            $queryBuilder->expr()->eq('email', '?')
        )
    );
По сути, QB просто позволяет писать запрос через текучий интерфейс, также как и DQL Builder.
Может быть полезен в случаях, когда запрос генерится динамически.

[транзакции]

Типичный пример:

	$conn->beginTransaction();
	try{
	    // do stuff
	    $conn->commit();
	} catch (\Exception $e) {
	    $conn->rollBack();
	    throw $e;
	}

Также есть более лаконичный вариант:

	$conn->transactional(function($conn) {
	    // do stuff
	});

Транзакции имеют разные уровни изоляции (управление через Connection::setTransactionIsolation($level))

	Connection::TRANSACTION_READ_UNCOMMITTED
	Connection::TRANSACTION_READ_COMMITTED
	Connection::TRANSACTION_REPEATABLE_READ
	Connection::TRANSACTION_SERIALIZABLE

Транзакции могут быть вложенными, но этот подход не рекомендуется.

По умолчанию, все запросы выполняются сразу, без ожидания commit.
Чтобы автоматически стартовать транзакцию и затем управлять ею, следует выключить автокоммит:

	$conn->setAutoCommit(false);
	$conn->connect();

	try {
	    // do stuff
	    $conn->commit();
	} catch (\Exception $e) {
	    $conn->rollBack();
	}

Транзакции связаны с блокировками. Чтобы была возможность обрабатывать блокировки,
следует ловить специальные эксепшены:
	
	\Doctrine\DBAL\Exception\RetryableException - общий
	\Doctrine\DBAL\Exception\DeadlockException - если несколько коннектов обращаются к одному блоку
	\Doctrine\DBAL\Exception\LockWaitTimeoutException - если транзакция по какой то причине долго ждёт своей очереди

[Типы]
Типы опять же независимы от платформы и конвертируются в конкретные типы БД.

smallint - 2 байта                             int
integer  - 4 байта                             int
bigint   - 8 байт                              string
demical  - фиксированная точность              string
float    - плавающая точность                  float/double
string   - строка конечной длины               string
text     - строка без максимальной длины       string
guid     - Globally Unique Identifier          string
binary   - бинарник конечной длины             resource
binary   - бинарник без максимальной длины     resource
boolean  - обычно в БД это smallint            boolean
date     - неизменяемая дата                   \DateTimeImmutable
datetime - время без часовой зоны              \DateTime (парситься функцией date_create())
datetime_immutable - неизменяемый datetime     \DateTimeImmutable
datetimetz - время с зоной                     \DateTime
datetimetz_immutable - неизменяемый datetimetz \DateTimeImmutable
dateinterval - разница между 2 datetime        \DateInterval
array - cериализация в строку                  array
simple_array - implode(',' arr)                array
json - UTF-8 валидный json                     array
json_array - deprecated
object - для сохранения PHP объекта            object (плохо работает из-за нул байтов, рекомендуется ручной base64_encode(serialize(obj))

Doctrine чекает схему базы для обратного преобразования в PHP.
(погонять типы)

Есть возможность создавать кастомные типы, но это очень редкий кейс.
Сначала его нужно создать в самой БД, затем отнаследовать Doctrine\DBAL\Types\Type.

[Схема]
Это часть далеко не полностью документирована, однако даёт мощные инструменты
управления всеми сущностями БД. Schema Manager абстрагирует работу с таблицами,
последовательностями, внешними ключами, индексами, отображениями.
Вот лишь небольшой пример того, что можно сделать:

	# получаем схему
	$fromSchema = $sm->createSchema();
	# копируем
	$toSchema = clone $fromSchema;
	# удаляем таблицу из новой схемы
	$toSchema->dropTable('user');
	# выводим sql, предствялющий собой diff между схемами
	$sql = $fromSchema->getMigrateToSql($toSchema, $conn->getDatabasePlatform());
	print_r($sql);

	# или
	$comparator = new \Doctrine\DBAL\Schema\Comparator();
	$schemaDiff = $comparator->compare($fromSchema, $toSchema);
	$queries = $schemaDiff->toSql($myPlatform);
	$saveQueries = $schemaDiff->toSaveSql($myPlatform);

Методы, генерирующие запросы, избегают проблем с отсутствующими внешними ключами,
что используется для генерации миграций.

[EventManager]

EventManager можно передать как в DriverManager, так и в Connection.
* PostConnect - сразу после коннекта. Удобен для установки сессионных настроек (некоторые листенеры есть из коробки)

Пример:

	$evm = new EventManager();
	$evm->addEventSubscriber(new OracleSessionInit([
		'NLS_TIME_FORMAT' => 'HH24:MI:SS',
	]));

	$conn = DriverManager::getConnection($connectionParams, null, $evm);

В основном же, нужно создавать свои листенеры, методы которых должны соотвествовать определенным
событиям.

$evm->addEventListener($eventName, new MyEventListener());

class MyEventListener
{
    public function onSchemaCreateTable(SchemaCreateTableEventArgs $event)
    {
        // Your EventListener code
    }
}

Это могут быть:

* OnSchemaCreateTable
* OnSchemaCreateTableColumn
* OnSchemaDropTable
* OnSchemaAlterTable
* OnSchemaAlterTableAddColumn
* OnSchemaAlterTableRemoveColumn
* OnSchemaAlterTableChangeColumn
* OnSchemaAlterTableRenameColumn
* OnSchemaColumnDefinition
* OnSchemaIndexDefinition


[Шардирование]
С некоторого времени Doctrine научилась в шардирование, т.е. в разбиение данных одних и тех же баз/таблиц
на несколько инстансов. Это позволяет горизонтально маштабироваться, но так же несёт с собой множество
нюансов, которые следует учитывать. Другими словами, шардирование - не "магическая" фича, и бизнес логику 
под неё нужно проектировать заранее.

- Нужны уникальные идентификаторы (GUID/UUID)
- Между шардами не работают транзакции
- Внешние ключи также не работают
- Сложности с агрегатами
- Необходимость композитных ключей
- Работа со схемой также дублируется

UUID также немного ухудшают производительность при работе с ними как с первичными ключами.
Чтобы UUID были переносимыми, следует создавать их на строне приложения, например используя https://github.com/ramsey/uuid

https://www.doctrine-project.org/projects/doctrine-dbal/en/2.8/reference/sharding_azure_tutorial.html#sqlazure-sharding-tutorial

	// на коннекте мы указываем признак, по которому разбиваются данные - distributionKey
	$conn = DriverManager::getConnection([
	    'sharding' => [
		    'federationName' => 'my_database',
	        'distributionKey' => 'customer_id',
        ]
	]);
	$shardManager = new SQLAzureShardManager($conn);
	// все запросы далее будут на том шарде, где находиться customer_id = 1234
	$currentCustomerId = 1234;
	$shardManager->selectShard($currentCustomerId);
	// так вернуться назад, к основному шарду
	$shardManager->selectGlobal();
	// узнать текущий шард
	$value = $shardManager->getCurrentDistributionValue();

Вторая важная возможность - "fan-out", т.е сделать запрос на всех шардах.
Порядок шардов не определён, поэтому заботиться о сортировке нужно в приложении:

	$sql = "SELECT * FROM customers";
	$rows = $shardManager->queryAll($sql, $params);


Для тех БД, которые не поддерживаются из коробки, достаточно реализовать несколько интерфейсов, см.
https://www.doctrine-project.org/projects/doctrine-dbal/en/2.8/reference/supporting-other-databases.html#supporting-other-databases

[Кэширование]
Doctrine\DBAL\Statement может кэшировать результат запроса. Для этого в коннект нужно передать объект кэша:

	// динамически устанавливаем кэш на соединение
	$cache = new \Doctrine\Common\Cache\ArrayCache();
	$config = $conn->getConfiguration();
	$config->setResultCacheImpl($cache);
	// теперь нужно передать QueryCacheProfile в запрос (?), есть возможность переопределить драйвер кэша
	$stmt = $conn->executeQuery($query, $params, $types, new QueryCacheProfile(0, "some key", $cache = null));
	$data = $stmt->fetchAll();
	// на этом моменте данные закэшируются
	$stmt->closeCursor();

### ORM
(выжимка из документации 2.6)
ORM - концепция, позволяющая работать с БД, оперируя в первую очередь с объектами, а не с массивами данных.
ORM самостоятельно преобразует выборки из базы в объекты, используя для этого заранее подготовленное
специальное описание - мапинг. Маппинг можно писать в аннотациях (по умолчанию так), но удобнее писать их в yaml.
Плюсы: маппинги в yaml легче переиспользовать, можно автоматически генерировать сущности(!), читаемость намного лучше чем в аннотациях.

[прокси]
Doctrine создает специальные прокси классы между маппингом и собственно сущностями, которые берут на себя ленивую
загрузку данных (но не только). Подумайте: ваши сущности являются обычными классами, исключительно с бизнес-логикой,
а весь "магический" функционал, созданный для оптимизации работы с БД, строго отделён от них (класс не знает, что его проксируют).

Получить именно прокси классы можно явно:

	$item = $em->getReference('MyProject\Model\Item', $itemId);
	$cart->addItem($item);

Как видно, совершенно не важно какой класс используется - настойщий или прокси, доктрина работает с ними единообразно.
Такой подход может улучшить производительность, если нужно связать А с B, при этом не инстанцируя B, т.е. не
делая лишнего запроса. Тоже самое всегда происходит при получении связанных объектов - по умолчанию все связанные объекты
являются прокси, и не будут реально извлечены из базы, пока данные не понадобятся.
(джойны в DQL переопределяют это поведение - там данные загружаются ВСЕГДА).

[Сущности]
Есть требования к сущностям (чтобы к ним можно было создать прокси):

	* отстутствие final
	* поля - private/protected (для сериализации - protected)
	* если делаешь __wake и __clone - [делай это безопасно](https://www.doctrine-project.org/projects/doctrine-orm/en/2.6/cookbook/implementing-wakeup-or-clone.html)
	* нет должно быть конфликта между именами полей и связей
	* нельзя func_get_args

Доктрина НИКОГДА не вызывает конструкторы сущностей, поэтому их можно использовать по своему усмотрению, с любыми аргументами.

Сущность может быть в одном из 4 состояний:

	* new
	* managed  - c id
	* detached - c id, но уже не связана с EM и unitOfWork
	* removed  - c id, связан, но будет удалён

Коллекции (Doctrine\Common\Collections\Collection) также можно использовать для работы с объектами (managed/detached).
В целом, сериализация не рекомендуется для сущностей по ряду технических причин.
EntityManager - просто обертка над UnitOfWork.

[Связи]
Важно понимать, что ссылки используемые в связях - это не просто внешние ключи, например в поле с OneToMany
по сути лежит мнгого id, по которым в дальнейшем можно будет запросить данные.

(слева - текущая сущность):
ManyToOne - наиболее популярная (у многих пользователей один адрес) === OneToOne двунаправленный???
OneToMany - тупо создаёт перекрестную таблицу
OneToOne  - как ManyToOne, но поле с внешним ключом УНИКАЛЬНО (у продукта может быть одно описание)
Связь считается однонаправленной, если только одна сторона хранит ссылку на другую сторону (owning side)

Двунаправленная ManyToOne === двунаправленная OneToMany

Двунаправленные имеют 2 ссылки (owner side / inverse side)
Doctrine проверяет изменения только на owner side. Это означает, что в случае двухнаправленных
ссылок вполне нормально, если они могут ссылаться на разные объекты, и контроль этих ситуаций
лежит на разработчике.

ManyToMany встречается редко, т.к. это как OneToMany, только с неуникальными записями
в перекрестной таблице, и вместо неё имеет завести просто промежуточную сущность.
ManyToMany на себя - типичный случай для организации "друзей"

Следующее касается только двухнаправленных связей:
- Обратная сторона должна иметь поле mappedBy в связи OneToOne/OneToMany/ManyToMany,
  которое содержит имя поля со стороны владельца.
- Сторона вледельца, соотвественно, иметь поле inversedBy в связи OneToOne/OneToMany/ManyToMany
  которое содержит имя поля с обратной стороны.
- ManyToOne всегда на стороне владельца
- OneToMany всегда на обратной стороне
- в OneToOne сторона владельца там, где внешний ключ

В качестве связи можно указывать и сущность своего типа (Self-referencing)

в случаях OneToMany и ManyToMany всегда следует инициализировать соотвествующие поля 
как ArrayCollection в конструкторах сущностей.

[Базовый маппинг]
Message:
  type: entity
  table: message (необязательно)
  id:
    id:
      type: integer
      generator:
        strategy: AUTO (способ инкремента, который предпочтителен в данной БД) | UUID | CUSTOM | SEQUENCE (для Oracle/Postgre)
        sequenceGenerator: (только если SEQUENCE)
          sequenceName: message_seq
          allocationSize: 100
          initialValue: 1
  fieldName:
    type: string (по умолчанию)
    length: 255 (по умолчанию)
    unique: false (по умолчанию)
    nullable: false (по умолчанию)
    precision: 0 (точность, только для decimal)
    scale: 0 (шкала, только для decimal)
    columnDefinition: (DDL сниппет для создания колонки)
    options: (ключ-зачения, передаваемые платформе)

allocationSize может дать хороший прирост для INSERT (в данном примере doctrine возьмет сразу 100 id для вставки сущностей)
(но следует использовать только для сгенеренных таблиц, чтобы избежать дублей ключей!)

[Пачки]

Вставка:

	$batchSize = 20;
	for ($i = 1; $i <= 10000; ++$i) {
	    $user = new CmsUser;
	    $user->setStatus('user');
	    $user->setUsername('user' . $i);
	    $user->setName('Mr.Smith-' . $i);
	    $em->persist($user);
	    if (($i % $batchSize) === 0) {
	        $em->flush();
	        $em->clear(); // Detaches all objects from Doctrine!
	    }
	}
	$em->flush();
	$em->clear();

Обновление:

	$q = $em->createQuery('update MyProject\Model\Manager m set m.salary = m.salary * 0.9');
	$numUpdated = $q->execute();

Удаление:

	$q = $em->createQuery('delete from MyProject\Model\Manager m where m.salary > 100000');
	$numDeleted = $q->execute();

Просто перебирать результаты, не тратя много памяти:

	$q = $this->_em->createQuery('select u from MyProject\Model\User u');
	$iterableResult = $q->iterate();
	foreach ($iterableResult as $row) {
	    // do stuff with the data in the row, $row[0] is always the object
	    // detach from Doctrine, so that it can be Garbage-Collected immediately
	    $this->_em->detach($row[0]);
	}


[Лучшие практики]

- Избегать двухнаправленных связей
- Удалять ненужные связи
- Избегать составных ключей
- Разумно использовать события и каскады (обосновывать использование)
- связи и поля должны быть отдельно
- явная демаркация транзакций

[Кэширование]
Все драйверы кэширования имеют интерфейс:

	$cacheDriver->setNamespace('my_namespace_');
	$cacheDriver->save('cache_id', 'my_data', $lifeTime);
	if ($cacheDriver->contains('cache_id')) {...};
	$array = $cacheDriver->fetch('my_array');
	$cacheDriver->delete('my_array');
	$deleted = $cacheDriver->deleteAll();

Чистить кэши также можно командами:

	# кэш sql (чтобы не билдить каждый раз из DQL)
	./doctrine orm:clear-cache:query
	# кэш маппинга
	./doctrine orm:clear-cache:metadata
	# кэш данных
	./doctrine orm:clear-cache:result


+ http://notmysock.org/blog/php/user-cache-timebomb.html

[События]


https://habr.com/post/334404/#comment_10335592
говорят, фильтры доктрины это плохо

Предварительный вывод: DBAL очень хорошо продуманная и легковестная либа,
отлично подойдет для любого проекта где есть реляционные БД.
ORM удобна, и её желательно использовать везде, где есть чёткая доменная система сущностей.
На базах с плохим дизайном она ляжет криво и потребуется выдумывать всевозможные костыли.
[таблица - dbal / orm - версии, ссылки, описание]
