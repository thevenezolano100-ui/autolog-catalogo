-- Insertar datos reales de vehículos (Extraídos de Qualid PDF)
INSERT INTO vehiculos (marca_auto, modelo, anio_inicio, anio_fin, motor) VALUES 
('Acura', 'Integra', 1996, 1999, '4L 1.8L'),
('Acura', 'Vigor', 1992, 1994, '6L 2.5L'),
('Toyota', '4Runner', 2000, 2023, 'V6 4.0L'),
('Chery', 'Orinoco', 2011, 2020, '1.8L'),
('Chevrolet', 'Aveo', 2005, 2015, '1.6L');

-- Insertar Productos Reales (Códigos de Qualid y Millard)
INSERT INTO productos (codigo_pieza, marca_id, categoria_id, descripcion, imagen_url) VALUES 
('QL-7317', 3, 1, 'Filtro de Aceite Sellado - Alta Eficiencia (Qualid)', 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'),
('QC-7599', 3, 3, 'Filtro de Gasolina para Inyección (Qualid)', 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'),
('QC-7729', 3, 1, 'Filtro de Aceite para Camionetas Toyota (Qualid)', 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'),
('ML-3387', 2, 1, 'Filtro de Aceite Millard - Protección de Motor', 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'),
('W-51348', 1, 1, 'Filtro de Aceite Premium Wix', 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png');

-- Crear las relaciones (Aplicaciones: qué filtro va en qué carro)
-- Ejemplo: QL-7317 le sirve al Acura Integra y al Vigor
INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES 
(1, 1), (1, 2), (2, 1), (3, 3), (4, 5);