2h 25m - проектирование данных, создание блога, init commit c основой бэкенда и фронтенда.
3h 15m - теория
1h 45m - теория

# 2week2hours - Gamers

целевая технология - ORM библиотека Doctrine

## Чему научимся:
Создание протопипа современного веб-сайта, с упором на управление моделями (см. M в MVC).
Проект называетcя "Gamers", и представляет собой базу игр, c некоторой бизнес-логикой вокруг этой базы.
В процессе мы разберём возможности Doctrine, оценим скорость разработки,
гибкость (или негибкость) решений из коробки, а также производительность библиотеки.

## init
Обычно я начинаю проект с Docker окружения. Соберём 3 сервиса:

	- php-fpm - бэкенд на PHP, всё стандартно.
	- nginx - это же веб, нужен веб сервер.
	- workspace - это специальный образ, заботливо собраный мной для "консольной" части моих проектов.
	Сюда входят пакетные менеджеры для PHP и Java Script, инструменты проверки качества кода,
	кроны и ещё много чего полезного. В данном проекте, вероятно, понадобятся только пакетные менеджеры.

[docker-compose & Makefile]

Что по зависимостям? Нам понадобятся сама Doctrine и инструмент для генерации тестовых данных.
Также при работе с БД стандартной практикой является механизм миграций, не будем ходить далеко и возьмём doctrine/migrations.
Так как нам волей-неволей придётся писать контроллеры, лично я категорически рекомендую использовать ООП обёртку над HTTP. Получается так:
[composer.json]

Касательно фронта - для меня, в-основном-бэкендера немного умеющего в vue, самый простой путь это установить
vue/vue-bootstrap/vue-router/laravel-mix (?!wtf, что это вообще такое?) через npm.
[package.json]

Кстати, базу данных я не устанавливаю - SQLite вполне достаточно для примера, а Doctrine уже сейчас оказывавает нам услугу -
благодаря DBAL в дальнейшем мы сможем легко и непринужденно перелезть на любую другую БД (если потребуется)

[тут полная последовательность действий для развертки]

## Проектирование данных

## Обзор Doctrine (выжимка из документации 2.8)

Несмотря на то, что Doctrine я использую не первый год, пришлось перечитать документацию, чтобы нигде не наврать. Общим счетом это заняло у меня
X часов.

Доктрина состоит из [набора модулей](https://www.doctrine-project.org/projects.html) с четко разграниченными зонами ответственности.
Наиболее значимые это DBAL (database abstraction layer) и ORM (Object Relational Mapper).

[далее спойлеры]

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

schema?

Также в DBAL поставляется набор Types, для преобразования типов PHP в типы БД и наоборот, с возможностью расширения.

	# тут можно включить логгер, кэшинг результатов, фильтр схем, отключить автокоммит
	$config = new \Doctrine\DBAL\Configuration();
	$connectionParams = [ типичные папраметры коннекта - логин. пароль. хост и т.д.];
	# получаем wrapped коннект
	# тут 3им параметром МОЖНО передать eventManager, config тоже опциональный
	$conn = \Doctrine\DBAL\DriverManager::getConnection($connectionParams, $config);

	# получение данных (по сути stmt это курсор?)
	# так делать не круто: sql инъекций, кавычки, лишние попытки оптимизации со стороны бд
	$stmt = $conn->query("SELECT * FROM articles");
	while ($row = $stmt->fetch()) {
	    echo $row['headline'];
	}

	# так то лучше!
	$sql = "SELECT * FROM users WHERE name = :name OR username = :name";
	$stmt = $conn->prepare($sql);
	$stmt->bindValue("name", $name);
	$stmt->execute();

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

Пример кастомного типа (непонятнаа):
https://www.doctrine-project.org/projects/doctrine-dbal/en/2.8/reference/types.html#custom-mapping-types

	# создаём в Postgre
	CREATE DOMAIN MyMoney AS DECIMAL(18,3);
	# ...




Предварительный вывод: DBAL очень хорошо продуманная и легковестная либа,
отлично подойдет для любого проекта где есть реляционные БД.
ORM удобна, и её желательно использовать везде, где есть чёткая доменная система сущностей.
На базах с плохим дизайном она ляжет криво и потребуется выдумывать всевозможные костыли.
